import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";

export function handleDbError(error: unknown): never {
  // 1. Rethrow TRPCErrors immediately to preserve service-level errors
  if (error instanceof TRPCError) {
    throw error;
  }

  // 2. Map Zod validation errors to BAD_REQUEST
  if (error instanceof ZodError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
      cause: error,
    });
  }

  // 3. Map common typed domain error classes or messages
  if (error instanceof Error) {
    const msg = error.message;

    if (msg.includes("Security Error:")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: msg.replace("Security Error:", "").trim(),
        cause: error,
      });
    }

    if (msg.includes("Validation Error:") && msg.includes("not found")) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: msg.replace("Validation Error:", "").trim(),
        cause: error,
      });
    }

    if (msg.includes("Validation Error:")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: msg.replace("Validation Error:", "").trim(),
        cause: error,
      });
    }

    // Custom join token errors mapping if uncaught
    if (error.name === "TokenNotFoundError") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: msg,
        cause: error,
      });
    }
    if (error.name === "TokenExpiredError" || error.name === "TokenLimitReachedError") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: msg,
        cause: error,
      });
    }
    if (error.name === "UserNotFoundError") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: msg,
        cause: error,
      });
    }
  }

  const err = error as Record<string, unknown> | null | undefined;
  const message = err?.message ? String(err.message) : "";

  // 4. Postgres specific error checks
  if (err && typeof err === "object" && "code" in err) {
    const code = String(err.code);
    const detail = err.detail ? String(err.detail) : "";

    if (code === "23505") {
      throw new TRPCError({
        code: "CONFLICT",
        message: `A record with this value already exists. ${detail}`,
        cause: error,
      });
    }

    if (code === "23503") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Referenced record does not exist or is inactive. ${detail}`,
        cause: error,
      });
    }

    if (code === "23502") {
      const column = err.column ? String(err.column) : "unknown field";
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Missing required field: ${column}.`,
        cause: error,
      });
    }
  }

  // 5. SQLite / LibSQL specific error checks
  if (message.includes("UNIQUE constraint failed")) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `A record with this value already exists. (${message})`,
      cause: error,
    });
  }

  if (message.includes("FOREIGN KEY constraint failed")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Referenced record does not exist or is inactive. (${message})`,
      cause: error,
    });
  }

  if (message.includes("NOT NULL constraint failed")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Missing required field. (${message})`,
      cause: error,
    });
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: message || "An unexpected database error occurred.",
    cause: error,
  });
}

