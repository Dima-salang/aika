/**
 * Upload paths are always: organizations/{orgId}/users/{userId}/...
 * Extract ownership from Cloudinary / Supabase URLs built that way.
 */
export type StorageOwnership = {
  organizationId: string;
  userId: string;
  relativePath: string;
};

const OWNERSHIP_RE = /(?:^|\/)organizations\/([^/]+)\/users\/([^/]+)(?:\/|$)/;

function extractPathFromUrl(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    const pathname = decodeURIComponent(url.pathname);

    // Cloudinary: /<cloud>/image/upload[/v123]/organizations/...
    const cloudinaryParts = pathname.split("/image/upload/");
    if (cloudinaryParts.length >= 2) {
      const rest = cloudinaryParts[1].replace(/^v\d+\//, "");
      return rest;
    }

    // Supabase public or signed: /object/(public|sign)/bucket/path
    const supabaseMatch = pathname.match(/\/object\/(?:public|sign)\/[^/]+\/(.+)$/);
    if (supabaseMatch) {
      return supabaseMatch[1];
    }

    return pathname.replace(/^\//, "");
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
