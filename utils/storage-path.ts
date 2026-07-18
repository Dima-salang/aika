/**
 * Upload paths are always: organizations/{orgId}/users/{userId}/...
 * Extract ownership from Cloudinary / Supabase URLs built that way.
 */
export type StorageOwnership = {
  organizationId: string;
  userId: string;
  relativePath: string;
};

const OWNERSHIP_RE = /^organizations\/([^/]+)\/users\/([^/]+)(?:\/|$)/;

function extractPathFromUrl(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    const hostname = url.hostname.toLowerCase();
    const isCloudinary = hostname === "cloudinary.com" || hostname.endsWith(".cloudinary.com");
    const isSupabase =
      hostname === "supabase.co" ||
      hostname.endsWith(".supabase.co") ||
      hostname === "supabase-storage.co" ||
      hostname.endsWith(".supabase-storage.co") ||
      hostname === "mock-supabase-storage.co";

    if (!isCloudinary && !isSupabase) return null;

    const pathname = decodeURIComponent(url.pathname);

    if (isCloudinary) {
      // Cloudinary: /<cloud>/image/upload[/v123]/organizations/...
      const match = pathname.match(/^\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+)$/);
      if (match) return match[1];
    }

    if (isSupabase) {
      // Supabase public or signed: /object/(public|sign)/documents/path
      const match = pathname.match(/^\/object\/(?:public|sign)\/documents\/(.+)$/);
      if (match) return match[1];
    }

    return null;
  } catch {
    return null;
  }
}

export function parseStorageOwnership(fileUrl: string): StorageOwnership | null {
  const path = extractPathFromUrl(fileUrl);
  if (!path) return null;

  const match = path.match(OWNERSHIP_RE);
  if (!match) return null;

  const organizationId = match[1];
  const userId = match[2];
  if (!organizationId || !userId) return null;

  return { organizationId, userId, relativePath: path };
}

export function assertOwnedStorageUrl(
  fileUrl: string,
  sessionUserId: string
): StorageOwnership {
  const ownership = parseStorageOwnership(fileUrl);
  if (!ownership) {
    throw new Error("Security Error: Unrecognized or unsafe storage URL");
  }
  if (ownership.userId !== sessionUserId) {
    throw new Error("Security Error: Cannot modify another user's files");
  }
  return ownership;
}
