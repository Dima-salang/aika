import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import crypto from "crypto";
import { isSupportedMimeType } from "@/utils/file";
import { StorageService } from "@/services/integrations/StorageService";

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
    const files = formData.getAll("file") as File[];
    const organizationId = formData.get("organizationId") as string | null;

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization context provided" }, { status: 400 });
    }

    const storageService = StorageService.getInstance();

    // 3. Pre-validate all files before starting uploads
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `File ${file.name} size exceeds 10MB limit` }, { status: 400 });
      }

      const mimeType = file.type;
      if (!isSupportedMimeType(mimeType)) {
        return NextResponse.json({ error: `Unsupported file type for ${file.name}` }, { status: 400 });
      }
    }

    // 4. Process uploads in parallel
    const uploadPromises = files.map(async (file) => {
      const mimeType = file.type;
      const fileKey = crypto.randomUUID();
      const originalName = file.name;
      const sanitizedFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueFileName = `${fileKey}-${sanitizedFileName}`;

      const isImage = mimeType.startsWith("image/");

      const path = isImage
        ? `organizations/${organizationId}/users/${userId}/images/${fileKey}`
        : `organizations/${organizationId}/users/${userId}/${uniqueFileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fileUrl = await storageService.upload(buffer, path, mimeType);
      return {
        fileUrl,
        fileKey,
        fileName: originalName,
        fileSize: file.size,
        mimeType,
      };
    });

    const results = await Promise.all(uploadPromises);

    return NextResponse.json({ files: results });
  } catch (error: any) {
    console.error("Upload handler error:", error);
    return NextResponse.json({ error: error.message || "Upload handler failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileUrls = searchParams.getAll("fileUrl");

    // Also parse JSON body if no URLs are in search query
    if (fileUrls.length === 0) {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body.fileUrls)) {
        fileUrls.push(...body.fileUrls);
      } else if (body.fileUrl) {
        fileUrls.push(body.fileUrl);
      }
    }

    if (fileUrls.length === 0) {
      return NextResponse.json({ error: "No fileUrl provided" }, { status: 400 });
    }

    const storageService = StorageService.getInstance();
    await storageService.deleteBatch(fileUrls);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete handler error:", error);
    return NextResponse.json({ error: error.message || "Delete handler failed" }, { status: 500 });
  }
}
