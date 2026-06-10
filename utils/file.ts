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

export function formatErrorMessage(err: unknown): string {
  if (!err) return "An unexpected error occurred.";
  
  let rawMessage = "";
  if (typeof err === "object" && err !== null && "message" in err) {
    rawMessage = String((err as { message: unknown }).message);
  } else if (typeof err === "string") {
    rawMessage = err;
  }
  
  try {
    const jsonStart = rawMessage.indexOf("[");
    const jsonEnd = rawMessage.lastIndexOf("]");
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonStr = rawMessage.slice(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        return parsed
          .map((issue: unknown) => {
            if (typeof issue !== "object" || issue === null) return "";
            const issueObj = issue as Record<string, unknown>;
            const field = Array.isArray(issueObj.path) ? issueObj.path.join(".") : "";
            const fieldLabel = field ? field.charAt(0).toUpperCase() + field.slice(1) : "Field";
            let msg = typeof issueObj.message === "string" ? issueObj.message : "is invalid";
            
            // Format specific error codes cleanly
            if (issueObj.code === "too_small") {
              if (issueObj.type === "string") {
                msg = "is required and cannot be empty";
              } else {
                msg = `must be at least ${issueObj.minimum}`;
              }
            } else if (issueObj.code === "too_big") {
              if (issueObj.type === "string") {
                msg = `cannot exceed ${issueObj.maximum} characters`;
              } else {
                msg = `must be at most ${issueObj.maximum}`;
              }
            } else if (issueObj.code === "invalid_type") {
              if (issueObj.received === "undefined" || issueObj.received === "null") {
                msg = "is required";
              } else {
                msg = "has an invalid type";
              }
            } else if (issueObj.code === "invalid_string") {
              msg = `must be a valid ${typeof issueObj.validation === "string" ? issueObj.validation : "format"}`;
            } else if (msg.includes("Required")) {
              msg = "is required";
            } else if (msg.includes("Too small") || msg.includes("expected string to have >=1 characters")) {
              msg = "is required and cannot be empty";
            }
            
            return `${fieldLabel} ${msg}.`;
          })
          .filter(Boolean)
          .join(" ");
      }
    }
  } catch (e) {
    // Ignore and fallback
  }

  // Handle nested or structured validation errors
  if (typeof err === "object" && err !== null) {
    const errObj = err as Record<string, unknown>;
    if (errObj.shape && typeof errObj.shape === "object" && "message" in (errObj.shape as Record<string, unknown>)) {
      return formatErrorMessage({ message: (errObj.shape as Record<string, unknown>).message });
    }
    if (errObj.data && typeof errObj.data === "object") {
      const dataObj = errObj.data as Record<string, unknown>;
      if (dataObj.zodError && typeof dataObj.zodError === "object") {
        const zodErrorObj = dataObj.zodError as Record<string, unknown>;
        if (zodErrorObj.fieldErrors && typeof zodErrorObj.fieldErrors === "object") {
          const fieldErrors = zodErrorObj.fieldErrors as Record<string, unknown>;
          const messages: string[] = [];
          for (const [field, msgs] of Object.entries(fieldErrors)) {
            const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1);
            const fieldMsgs = Array.isArray(msgs) ? msgs.join(", ") : String(msgs);
            messages.push(`${fieldLabel}: ${fieldMsgs}`);
          }
          if (messages.length > 0) return messages.join(". ");
        }
      }
    }
  }

  return rawMessage || "An unexpected error occurred.";
}
