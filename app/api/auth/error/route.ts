import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get("error") || "authentication_failed";
  const description = searchParams.get("error_description") || "";
  
  const redirectUrl = new URL("/auth", request.url);
  redirectUrl.searchParams.set("error", error);
  if (description) {
    redirectUrl.searchParams.set("description", description);
  }
  
  return NextResponse.redirect(redirectUrl);
}
