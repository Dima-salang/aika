import { TimeLogObserver } from "./TimeLogObserver";
import { notionService } from "../integrations/NotionService";
import { DBInstance } from "@/db";

const NotionLogProperties = new Set([
  "title",
  "description",
  "startTime",
  "endTime",
  "duration",
  "projectId",
  "teamId",
  "organizationId"
]);

export class NotionTimeLogObserver implements TimeLogObserver {
  async onLogCreated(logId: string, userId: string, tx?: DBInstance): Promise<void> {
    await notionService.syncLog("create", logId, userId, tx);
  }

  async onLogUpdated(logId: string, userId: string, updatedFields?: string[], tx?: DBInstance): Promise<void> {
    const requiresNotionUpdate = !updatedFields || updatedFields.some(field => NotionLogProperties.has(field));
    if (requiresNotionUpdate) {
      await notionService.syncLog("update", logId, userId, tx);
    }
  }

  async onLogDeleted(logId: string, userId: string, tx?: DBInstance): Promise<void> {
    await notionService.syncLog("delete", logId, userId, tx);
  }
}
