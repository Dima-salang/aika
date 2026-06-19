import { Client } from "@notionhq/client";
import { db, DBInstance } from "@/db";
import { tables } from "@/db/tables";
import { eq } from "drizzle-orm";
import { formatDuration } from "@/utils/time";

export interface NotionSyncOptions {
  timeLogId: string;
  userId: string;
  tx?: DBInstance;
}

export class NotionService {
  /**
   * Main entry point to coordinate time log syncing with Notion
   */
  async syncLog(
    action: "create" | "update" | "delete",
    timeLogId: string,
    userId: string,
    tx: DBInstance = db
  ): Promise<void> {
    try {
      const notionConfig = await this.getNotionConfig(userId, tx);
      if (!notionConfig) {
        return;
      }

      const notion = new Client({ auth: notionConfig.accessToken });

      switch (action) {
        case "create":
          await this.createPage(timeLogId, notionConfig.databaseId, notion, tx);
          break;
        case "update":
          await this.updatePage(timeLogId, notionConfig.databaseId, notion, tx);
          break;
        case "delete":
          await this.deletePage(timeLogId, notion, tx);
          break;
      }
    } catch (err) {
      console.error("Error syncing to Notion:", err);
    }
  }

  /**
   * Retrieves the Notion access token and target database ID for a user.
   */
  private async getNotionConfig(
    userId: string,
    tx: DBInstance
  ): Promise<{ accessToken: string; databaseId: string } | null> {
    const [userRecord] = await tx
      .select({
        accessToken: tables.user.notion_access_token,
        databaseId: tables.user.notion_database_id,
      })
      .from(tables.user)
      .where(eq(tables.user.id, userId));

    if (!userRecord || !userRecord.accessToken || !userRecord.databaseId) {
      return null;
    }

    return {
      accessToken: userRecord.accessToken,
      databaseId: userRecord.databaseId,
    };
  }

  /**
   * Creates a page in Notion representing a time log.
   */
  private async createPage(
    timeLogId: string,
    databaseId: string,
    notion: Client,
    tx: DBInstance
  ): Promise<void> {
    const combinedLogData = await this.getCombinedLogData(timeLogId, tx);
    if (!combinedLogData) {
      throw new Error("Notion Error: Time log not found");
    }

    const { log, orgName, teamName, projectName } = combinedLogData;
    const durationStr = formatDuration(log.duration);
    const notionTitle = log.title || log.description || "Time Log";

    try {
      console.log("Attempting to create Notion page with full properties...");
      const pageResponse = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          Name: {
            title: [{ text: { content: notionTitle } }],
          },
          Date: {
            date: {
              start: log.start_time.toISOString(),
              end: log.end_time.toISOString(),
            },
          },
          Project: {
            rich_text: [{ text: { content: projectName } }],
          },
          Duration: {
            number: log.duration,
          },
          "Readable Duration": {
            rich_text: [{ text: { content: durationStr } }],
          },
          Organization: {
            rich_text: [{ text: { content: orgName } }],
          },
          Team: {
            rich_text: [{ text: { content: teamName } }],
          },
        },
      });

      // update time log with notion page id in db 
      await tx
        .update(tables.timeLogs)
        .set({ notion_page_id: pageResponse.id })
        .where(eq(tables.timeLogs.id, timeLogId));
    } catch (createErr: any) {
      console.warn("Failed to create Notion page with full properties, retrying with title only...", createErr);
      if (createErr.message?.includes("Property not found")) {
        throw new Error("Notion Error: Database schema mismatch. Please update your Notion database with the required properties.");
      }
      const pageResponse = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          Name: {
            title: [{ text: { content: notionTitle } }],
          },
        },
      });

      await tx
        .update(tables.timeLogs)
        .set({ notion_page_id: pageResponse.id })
        .where(eq(tables.timeLogs.id, timeLogId));
    }
  }

  /**
   * Updates an existing time log page in Notion.
   * If the page ID doesn't exist, self-heals by calling createPage.
   */
  private async updatePage(
    timeLogId: string,
    databaseId: string,
    notion: Client,
    tx: DBInstance
  ): Promise<void> {
    const combinedLogData = await this.getCombinedLogData(timeLogId, tx);
    if (!combinedLogData) {
      throw new Error("Notion Error: Time log not found");
    }

    const { log, projectName } = combinedLogData;
    if (!log.notion_page_id) {
      // Self-healing: Create the page in Notion if it didn't exist
      await this.createPage(timeLogId, databaseId, notion, tx);
      return;
    }

    const durationStr = formatDuration(log.duration);
    const notionTitle = log.title || log.description || "Time Log";

    try {
      await notion.pages.update({
        page_id: log.notion_page_id,
        properties: {
          Name: {
            title: [{ text: { content: notionTitle } }],
          },
          Date: {
            date: {
              start: log.start_time.toISOString(),
              end: log.end_time.toISOString(),
            },
          },
          Project: {
            rich_text: [{ text: { content: projectName } }],
          },
          Duration: {
            number: log.duration,
          },
          "Readable Duration": {
            rich_text: [{ text: { content: durationStr } }],
          },
        },
      });
    } catch (updateErr: any) {
      console.warn("Failed to update Notion page with full properties, retrying with title only...", updateErr);
      if (updateErr.message?.includes("Property not found")) {
        throw new Error("Notion Error: Database schema mismatch. Please update your Notion database with the required properties.");
      }
      await notion.pages.update({
        page_id: log.notion_page_id,
        properties: {
          Name: {
            title: [{ text: { content: notionTitle } }],
          },
        },
      });
    }
  }

  /**
   * Deletes (archives) a time log page in Notion.
   */
  private async deletePage(
    timeLogId: string,
    notion: Client,
    tx: DBInstance
  ): Promise<void> {
    const [existingLog] = await tx
      .select({ notionPageId: tables.timeLogs.notion_page_id })
      .from(tables.timeLogs)
      .where(eq(tables.timeLogs.id, timeLogId));

    if (existingLog?.notionPageId) {
      await notion.pages.update({
        page_id: existingLog.notionPageId,
        in_trash: true,
      });
    }
  }

  /**
   * Helper to fetch log data joined with project, team, and organization details.
   */
  private async getCombinedLogData(timeLogId: string, tx: DBInstance) {
    const [combined] = await tx
      .select({
        orgName: tables.organization.name,
        teamName: tables.teams.name,
        projectName: tables.projects.name,
        log: tables.timeLogs,
      })
      .from(tables.timeLogs)
      .leftJoin(tables.projects, eq(tables.timeLogs.project_id, tables.projects.id))
      .leftJoin(tables.teams, eq(tables.timeLogs.team_id, tables.teams.id))
      .leftJoin(tables.organization, eq(tables.timeLogs.organization_id, tables.organization.id))
      .where(eq(tables.timeLogs.id, timeLogId));

    if (!combined) {
      return null;
    }

    return {
      log: combined.log,
      orgName: combined.orgName ?? "None",
      teamName: combined.teamName ?? "None",
      projectName: combined.projectName ?? "None",
    };
  }
}

export const notionService = new NotionService();