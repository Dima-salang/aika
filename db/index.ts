import { drizzle as pgDrizzle } from "drizzle-orm/postgres-js";
import { drizzle as sqliteDrizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL || "sqlite:///aika.db";

// Detect database protocol
export const isSQLite = 
  databaseUrl.startsWith("sqlite:") || 
  databaseUrl.startsWith("file:") || 
  databaseUrl.endsWith(".db") ||
  databaseUrl.includes("sqlite");

// Initialize client dynamically based on dialect
let pgClient: ReturnType<typeof postgres> | null = null;
let sqliteClient: ReturnType<typeof createClient> | null = null;

export let db: any;

if (isSQLite) {
  // Convert standard sqlite:/// URI to a file path compatible with LibSQL if needed
  let url = databaseUrl;
  if (url.startsWith("sqlite:///")) {
    url = "file:" + url.replace("sqlite:///", "");
  }
  sqliteClient = createClient({ url });
  db = sqliteDrizzle(sqliteClient, { schema });
} else {
  pgClient = postgres(databaseUrl);
  db = pgDrizzle(pgClient, { schema });
}

export type DbType = typeof db;
