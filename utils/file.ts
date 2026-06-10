export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
];

export function isSupportedMimeType(mime: string): boolean {
  const normalized = mime.toLowerCase();
  if (normalized.startsWith("image/")) return true;
  return ALLOWED_MIME_TYPES.includes(normalized);
}

export function isImageUrl(url: string): boolean {
  if (url.includes("cloudinary.com")) return true;
  const ext = url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase();
  return ["png", "jpg", "jpeg", "webp", "gif"].includes(ext || "");
}

export function formatErrorMessage(err: any): string {
  if (!err) return "An unexpected error occurred.";
  
  const rawMessage = err.message || (typeof err === "string" ? err : "");
  
  try {
    const jsonStart = rawMessage.indexOf("[");
    const jsonEnd = rawMessage.lastIndexOf("]");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonStr = rawMessage.slice(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        return parsed
          .map((issue: any) => {
            const field = issue.path ? issue.path.join(".") : "";
            const fieldLabel = field ? field.charAt(0).toUpperCase() + field.slice(1) : "Field";
            let msg = issue.message || "is invalid";
            
            // Format specific error codes cleanly
            if (issue.code === "too_small") {
              if (issue.type === "string") {
                msg = "is required and cannot be empty";
              } else {
                msg = `must be at least ${issue.minimum}`;
              }
            } else if (issue.code === "too_big") {
              if (issue.type === "string") {
                msg = `cannot exceed ${issue.maximum} characters`;
              } else {
                msg = `must be at most ${issue.maximum}`;
              }
            } else if (issue.code === "invalid_type") {
              if (issue.received === "undefined" || issue.received === "null") {
                msg = "is required";
              } else {
                msg = "has an invalid type";
              }
            } else if (issue.code === "invalid_string") {
              msg = `must be a valid ${issue.validation || "format"}`;
            } else if (msg.includes("Required")) {
              msg = "is required";
            } else if (msg.includes("Too small") || msg.includes("expected string to have >=1 characters")) {
              msg = "is required and cannot be empty";
            }
            
            return `${fieldLabel} ${msg}.`;
          })
          .join(" ");
      }
    }
  } catch (e) {
    // Ignore and fallback
  }

  // Handle nested or structured validation errors
  if (err.shape?.message) {
    return formatErrorMessage({ message: err.shape.message });
  }
  if (err.data?.zodError?.fieldErrors) {
    const fieldErrors = err.data.zodError.fieldErrors;
    const messages: string[] = [];
    for (const [field, msgs] of Object.entries(fieldErrors)) {
      const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1);
      const fieldMsgs = Array.isArray(msgs) ? msgs.join(", ") : String(msgs);
      messages.push(`${fieldLabel}: ${fieldMsgs}`);
    }
    if (messages.length > 0) return messages.join(". ");
  }

  return rawMessage || "An unexpected error occurred.";
}
