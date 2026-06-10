import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import crypto from "crypto";
import { isSupportedMimeType } from "@/utils/file";
import { StorageService } from "@/services/StorageService";

export async function POST(req: NextRequest) {
  try {
    // 1. Session & Auth checks
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Parse payload
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const organizationId = formData.get("organizationId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization context provided" }, { status: 400 });
    }

    // 3. Validation
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    const mimeType = file.type;
    if (!isSupportedMimeType(mimeType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const fileKey = crypto.randomUUID();
    const originalName = file.name;
    const sanitizedFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${fileKey}-${sanitizedFileName}`;

    const isImage = mimeType.startsWith("image/");
    
    // Construct path matching the previous implementation's directories
    const path = isImage
      ? `organizations/${organizationId}/users/${userId}/images/${fileKey}`
      : `organizations/${organizationId}/users/${userId}/${uniqueFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use decoupled StorageService
    const storageService = StorageService.getInstance();
    const fileUrl = await storageService.upload(buffer, path, mimeType);

    return NextResponse.json({
      fileUrl,
      fileKey,
      fileName: originalName,
      fileSize: file.size,
      mimeType,
    });
  } catch (error: any) {
    console.error("Upload handler error:", error);
    return NextResponse.json({ error: error.message || "Upload handler failed" }, { status: 500 });
  }
}
