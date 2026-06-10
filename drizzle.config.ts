import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL || "file:aika.db";
const isSQLite =
  databaseUrl.startsWith("sqlite:") ||
  databaseUrl.startsWith("file:") ||
  databaseUrl.endsWith(".db") ||
  databaseUrl.includes("sqlite");

export default defineConfig({
  schema: "./db/schema.ts",
  out: isSQLite ? "./drizzle-sqlite" : "./drizzle",
  dialect: isSQLite ? "sqlite" : "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});

