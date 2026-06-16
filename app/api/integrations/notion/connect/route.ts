import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { env } from "@/env/env";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = env.NOTION_CLIENT_ID;
  const redirectUri = env.NOTION_REDIRECT_URI || `${request.nextUrl.origin}/api/integrations/callback/notion`;

  if (!clientId) {
    const errorRedirect = new URL("/", request.url);
    errorRedirect.searchParams.set("integration", "notion");
    errorRedirect.searchParams.set("status", "error");
    errorRedirect.searchParams.set("message", "Notion integration is not configured on the server. Please set NOTION_CLIENT_ID.");
    return NextResponse.redirect(errorRedirect);
  }

  const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return NextResponse.redirect(notionAuthUrl);
}
