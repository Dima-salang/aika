/**
 * Allow only same-origin relative paths. Rejects protocol-relative, absolute,
 * and backslash-trick URLs used for open redirects.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;

  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }

  // Block schemes smuggled after the first slash (e.g. /\\evil.com, /http://...)
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return fallback;
  }

  try {
    const resolved = new URL(trimmed, "http://safe.local");
    if (resolved.origin !== "http://safe.local") {
      return fallback;
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
