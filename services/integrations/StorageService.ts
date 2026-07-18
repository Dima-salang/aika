import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";

export interface StorageProvider {
  upload(fileBuffer: Buffer, path: string, mimeType: string): Promise<string>;
  delete(fileUrl: string): Promise<void>;
  deleteBatch(fileUrls: string[]): Promise<void>;
}

// Check for Cloudinary placeholders
function isCloudinaryPlaceholder(): boolean {
  const name = process.env.CLOUDINARY_CLOUD_NAME || "";
  const key = process.env.CLOUDINARY_API_KEY || "";
  return !name || name.includes("placeholder") || !key || key.includes("placeholder");
}

// Check for Supabase placeholders
function isSupabasePlaceholder(): boolean {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || "";
  return !url || url.includes("placeholder") || !key || key.includes("placeholder");
}

export class CloudinaryStorageProvider implements StorageProvider {
  async upload(fileBuffer: Buffer, path: string, mimeType: string): Promise<string> {
    const uniqueFileName = path.split("/").pop() || path;
    if (isCloudinaryPlaceholder()) {
      return `https://res.cloudinary.com/mock-cloud/image/upload/v123456789/${path}`;
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Extract folder path and public ID
    const pathParts = path.split("/");
    const fileKey = pathParts.pop()?.split(".")[0] || "file";
    const folder = pathParts.join("/");

    const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: folder || "images",
          public_id: fileKey,
        },
        (error, result) => {
          if (error) reject(error);
          else if (!result) reject(new Error("Cloudinary upload failed: no result returned"));
          else resolve(result);
        }
      ).end(fileBuffer);
    });

    return uploadResult.secure_url;
  }

  async delete(fileUrl: string): Promise<void> {
    if (isCloudinaryPlaceholder()) {
      console.log(`[Mock Cloudinary] Deleted: ${fileUrl}`);
      return;
    }

    const publicId = this.getPublicId(fileUrl);
    if (!publicId) return;

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    await new Promise<void>((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) reject(error);
        else {
          console.log(`Cloudinary deletion result for ${publicId}:`, result);
          resolve();
        }
      });
    });
  }

  async deleteBatch(fileUrls: string[]): Promise<void> {
    if (isCloudinaryPlaceholder()) {
      console.log(`[Mock Cloudinary] Deleted batch of ${fileUrls.length} files`);
      return;
    }

    const publicIds = fileUrls.map(url => this.getPublicId(url)).filter((id): id is string => !!id);
    if (publicIds.length === 0) return;

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    await new Promise<void>((resolve, reject) => {
      cloudinary.api.delete_resources(publicIds, (error, result) => {
        if (error) reject(error);
        else {
          console.log(`Cloudinary batch deletion result:`, result);
          resolve();
        }
      });
    });
  }

  private getPublicId(url: string): string | null {
    if (!url.includes("cloudinary.com")) return null;
    try {
      const parts = url.split("/image/upload/");
      if (parts.length < 2) return null;
      const pathAndExt = parts[1];
      const pathParts = pathAndExt.split("/");
      // Strip version number like v123456789
      if (pathParts[0].startsWith("v") && /^\d+$/.test(pathParts[0].slice(1))) {
        pathParts.shift();
      }
      const pathWithExt = pathParts.join("/");
      const lastDotIdx = pathWithExt.lastIndexOf(".");
      if (lastDotIdx === -1) return pathWithExt;
      return pathWithExt.substring(0, lastDotIdx);
    } catch {
      return null;
    }
  }
}

export class SupabaseStorageProvider implements StorageProvider {
  async upload(fileBuffer: Buffer, path: string, mimeType: string): Promise<string> {
    if (isSupabasePlaceholder()) {
      return `https://mock-supabase-storage.co/object/public/documents/${path}`;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error } = await supabase.storage
      .from("documents")
      .upload(path, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    const { data: signData, error: signError } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 100); // 100 years

    if (signError || !signData) {
      throw new Error(`Failed to generate signed URL: ${signError?.message || "Unknown error"}`);
    }

    return signData.signedUrl;
  }

  async delete(fileUrl: string): Promise<void> {
    if (isSupabasePlaceholder()) {
      console.log(`[Mock Supabase] Deleted: ${fileUrl}`);
      return;
    }

    const path = this.getStoragePath(fileUrl);
    if (!path) return;

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.storage
      .from("documents")
      .remove([path]);

    if (error) {
      console.error(`Supabase Storage deletion error for ${path}:`, error);
      throw new Error(`Attachment deletion failed. Please try again.`);
    }
  }

  async deleteBatch(fileUrls: string[]): Promise<void> {
    if (isSupabasePlaceholder()) {
      console.log(`[Mock Supabase] Deleted batch of ${fileUrls.length} files`);
      return;
    }

    const paths = fileUrls.map(url => this.getStoragePath(url)).filter((p): p is string => !!p);
    if (paths.length === 0) return;

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.storage
      .from("documents")
      .remove(paths);

    if (error) {
      console.error(`Supabase Storage batch deletion error:`, error);
      throw new Error(`Attachment deletion failed. Please try again.`);
    }
  }

  private getStoragePath(url: string): string | null {
    if (!url.includes("supabase.co") && !url.includes("supabase-storage.co")) return null;
    try {
      const match = url.match(/\/object\/(?:public|sign)\/[^/]+\/([^?]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  }
}

export class StorageService {
  private static instance: StorageService | null = null;

  private static getHostname(fileUrl: string): string | null {
    try {
      return new URL(fileUrl).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  private static isCloudinaryUrl(fileUrl: string): boolean {
    const host = this.getHostname(fileUrl);
    return !!host && (host === "cloudinary.com" || host.endsWith(".cloudinary.com"));
  }

  private static isSupabaseUrl(fileUrl: string): boolean {
    const host = this.getHostname(fileUrl);
    return !!host && (
      host === "supabase.co" ||
      host.endsWith(".supabase.co") ||
      host === "supabase-storage.co" ||
      host.endsWith(".supabase-storage.co")
    );
  }

  constructor(
    private cloudinaryProvider: StorageProvider = new CloudinaryStorageProvider(),
    private supabaseProvider: StorageProvider = new SupabaseStorageProvider()
  ) { }

  static getInstance(): StorageService {
    if (!this.instance) {
      this.instance = new StorageService();
    }
    return this.instance;
  }

  static setInstance(service: StorageService): void {
    this.instance = service;
  }

  async upload(fileBuffer: Buffer, path: string, mimeType: string): Promise<string> {
    const isImage = mimeType.startsWith("image/");
    if (isImage) {
      return this.cloudinaryProvider.upload(fileBuffer, path, mimeType);
    } else {
      return this.supabaseProvider.upload(fileBuffer, path, mimeType);
    }
  }

  async delete(fileUrl: string): Promise<void> {
    try {
      if (StorageService.isCloudinaryUrl(fileUrl)) {
        await this.cloudinaryProvider.delete(fileUrl);
      } else if (StorageService.isSupabaseUrl(fileUrl)) {
        await this.supabaseProvider.delete(fileUrl);
      }
    } catch (err) {
      // Gracefully catch and log deletion errors to avoid blocking parent updates/transactions
      console.error(`Failed to delete storage file at ${fileUrl}:`, err);
    }
  }

  async deleteBatch(fileUrls: string[]): Promise<void> {
    try {
      const cloudinaryUrls = fileUrls.filter(url => StorageService.isCloudinaryUrl(url));
      const supabaseUrls = fileUrls.filter(url => StorageService.isSupabaseUrl(url));

      const deletePromises: Promise<any>[] = [];

      if (cloudinaryUrls.length > 0) {
        deletePromises.push(this.cloudinaryProvider.deleteBatch(cloudinaryUrls));
      }

      if (supabaseUrls.length > 0) {
        deletePromises.push(this.supabaseProvider.deleteBatch(supabaseUrls));
      }

      await Promise.all(deletePromises);
    } catch (err) {
      console.error("Failed to delete batch of storage files:", err);
    }
  }
}
