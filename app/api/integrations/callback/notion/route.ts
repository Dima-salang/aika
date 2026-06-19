import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { env } from "@/env/env";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { Client, CreateDatabaseParameters, isFullDatabase } from "@notionhq/client";
import { tables } from "@/db/tables";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    const homeUrl = new URL("/", request.url);
    homeUrl.searchParams.set("integration", "notion");

    if (error) {
        homeUrl.searchParams.set("status", "error");
        homeUrl.searchParams.set("message", `Notion authorization failed: ${error}`);
        return NextResponse.redirect(homeUrl);
    }

    if (!code) {
        homeUrl.searchParams.set("status", "error");
        homeUrl.searchParams.set("message", "Authorization code is missing.");
        return NextResponse.redirect(homeUrl);
    }

    // 1. Authenticate user
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const clientId = env.NOTION_CLIENT_ID;
        const clientSecret = env.NOTION_CLIENT_SECRET;
        const redirectUri = env.NOTION_REDIRECT_URI || `${request.nextUrl.origin}/api/integrations/callback/notion`;

        if (!clientId || !clientSecret) {
            throw new Error("Missing Notion Client ID or Secret in environment configuration.");
        }

        // 2. Exchange code for Notion access token (notion oauth token endpoint is outside standard SDK functions)
        const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
            },
            body: JSON.stringify({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            throw new Error(errorData.error_description || errorData.error || "Failed to exchange Notion token.");
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        const workspaceName = tokenData.workspace_name || "Notion Workspace";

        // Initialize Notion Client
        const notion = new Client({ auth: accessToken });

        // Fetch the user record from the database to see if we already have a database ID stored
        const [existingUser] = await db
            .select({
                notionDatabaseId: tables.user.notion_database_id,
            })
            .from(tables.user)
            .where(eq(tables.user.id, session.user.id));

        let dataSourceId: string | undefined = existingUser?.notionDatabaseId || undefined;

        // If a database ID exists in the DB, verify if it still exists in Notion
        if (dataSourceId) {
            try {
                await notion.databases.retrieve({ database_id: dataSourceId });
            } catch (retrieveErr) {
                // If it fails (e.g. deleted or access lost), clear it so we search/recreate
                dataSourceId = undefined;
            }
        }

        // 3. Check if Aika Workspace page or Aika Time Logs database already exists (Search fallback)
        let existingWorkspacePage: any = null;
        if (!dataSourceId) {
            const dbSearch = await notion.search({
                query: "Aika",
            });

            const getPageTitle = (p: any): string | undefined => {
                const props = p.properties || {};
                const titleProp = props.title || props.Name;
                return titleProp?.title?.[0]?.plain_text;
            };

            existingWorkspacePage = dbSearch.results.find(
                (r) => r.object === "page" && getPageTitle(r) === "Aika Workspace"
            );

            const existingDb = dbSearch.results.find(
                (d) => (d.object as string) === "database" && "title" in d && Array.isArray((d as any).title) && (d as any).title[0]?.plain_text === "Aika Time Logs"
            );

            if (existingDb && isFullDatabase(existingDb)) {
                dataSourceId = (existingDb as any).data_sources?.[0]?.id || (existingDb as any).id;
            }
        }

        // 4. Create database if it does not exist
        if (!dataSourceId) {
            let workspacePageId: string;

            if (existingWorkspacePage) {
                workspacePageId = existingWorkspacePage.id;
            } else {
                const workspacePage = await notion.pages.create({
                    parent: {
                        type: "workspace",
                        workspace: true,
                    },
                    properties: {
                        title: {
                            title: [{ text: { content: "Aika Workspace" } }],
                        },
                    },
                });
                workspacePageId = workspacePage.id;
            }

            const createDbData = await notion.databases.create({
                parent: {
                    type: "page_id",
                    page_id: workspacePageId,
                },
                title: [
                    {
                        type: "text",
                        text: { content: "Aika Time Logs" },
                    },
                ],
                initial_data_source: {
                    properties: {
                        Name: { title: {} },
                        Date: { date: {} },
                        Project: { rich_text: {} },
                        Team: { rich_text: {} },
                        Organization: { rich_text: {} },
                        Duration: { number: {} },
                        "Readable Duration": { rich_text: {} },
                    }
                }
            } as CreateDatabaseParameters);

            if (!isFullDatabase(createDbData)) {
                throw new Error("Created database response is incomplete.");
            }
            dataSourceId = createDbData.id;
        }

        if (!dataSourceId) {
            throw new Error("Failed to retrieve or create the Notion database data source.");
        }

        const userTable = tables.user;
        await db.update(userTable)
            .set({
                notion_access_token: accessToken,
                notion_database_id: dataSourceId,
                notion_workspace_name: workspaceName,
            })
            .where(eq(userTable.id, session.user.id));
        homeUrl.searchParams.set("status", "success");
        return NextResponse.redirect(homeUrl);
    } catch (err: any) {
        console.error("Notion integration callback error:", err);
        homeUrl.searchParams.set("status", "error");
        homeUrl.searchParams.set("message", err.message || "An unexpected error occurred.");
        return NextResponse.redirect(homeUrl);
    }
}