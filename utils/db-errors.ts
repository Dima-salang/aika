import { TRPCError } from "@trpc/server";

export function handleDbError(error: unknown): never {
  const err = error as Record<string, unknown> | null | undefined;
  const message = err?.message ? String(err.message) : "";

  // 1. Postgres specific error checks
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

  // 2. SQLite / LibSQL specific error checks
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

  // Fallback to original or generic error
  if (error instanceof TRPCError) {
    throw error;
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: message || "An unexpected database error occurred.",
    cause: error,
  });
}
