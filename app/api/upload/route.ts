import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";
import { isSupportedMimeType } from "@/utils/file";

// Helper to determine if Supabase storage is configured with real keys
function isSupabasePlaceholder() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || "";
  return (
    !url ||
    url.includes("placeholder") ||
    !key ||
    key.includes("placeholder")
  );
}

// Helper to determine if Cloudinary is configured with real keys
function isCloudinaryPlaceholder() {
  const name = process.env.CLOUDINARY_CLOUD_NAME || "";
  const key = process.env.CLOUDINARY_API_KEY || "";
  const secret = process.env.CLOUDINARY_API_SECRET || "";
  return (
    !name ||
    name.includes("placeholder") ||
    !key ||
    key.includes("placeholder") ||
    !secret ||
    secret.includes("placeholder")
  );
}


export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const reqHeaders = await headers();
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const organizationId = formData.get("organizationId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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

    // 4. File Routing & Uploading
    let fileUrl = "";

    if (isImage) {
      if (isCloudinaryPlaceholder()) {
        // Fallback Mock URL for local development
        fileUrl = `https://res.cloudinary.com/mock-cloud/image/upload/v123456789/${uniqueFileName}`;
      } else {
        // Upload to Cloudinary
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploadResult = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder: `organizations/${organizationId}/users/${userId}/images`,
              public_id: fileKey,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(buffer);
        });

        fileUrl = uploadResult.secure_url;
      }
    } else {
      // PDF/other docs -> Supabase Object Storage
      if (isSupabasePlaceholder()) {
        // Fallback Mock URL for local development
        fileUrl = `https://mock-supabase-storage.co/object/public/evidences/organizations/${organizationId}/users/${userId}/${uniqueFileName}`;
      } else {
        // Upload to Supabase Storage
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_ANON_KEY!
        );

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const storagePath = `organizations/${organizationId}/users/${userId}/${uniqueFileName}`;

        // Attempt upload to 'evidences' bucket
        const { error } = await supabase.storage
          .from("evidences")
          .upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (error) {
          console.error("Supabase Storage error:", error);
          return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from("evidences")
          .getPublicUrl(storagePath);

        fileUrl = publicUrlData.publicUrl;
      }
    }

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
