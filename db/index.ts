import { drizzle as pgDrizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as sqliteDrizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL || "file:aika.db";

// Detect database protocol
export const isSQLite =
  databaseUrl.startsWith("sqlite:") ||
  databaseUrl.startsWith("file:") ||
  databaseUrl.endsWith(".db") ||
  databaseUrl.includes("sqlite");

// Initialize client dynamically based on dialect
let pgClient: ReturnType<typeof postgres> | null = null;
let sqliteClient: ReturnType<typeof createClient> | null = null;

export type DBInstance = PostgresJsDatabase<typeof schema>;

export let db: DBInstance;

if (isSQLite) {
  // Convert standard sqlite:/// URI to a file path compatible with LibSQL if needed
  let url = databaseUrl;
  sqliteClient = createClient({ url });
  db = sqliteDrizzle(sqliteClient, { schema }) as unknown as DBInstance;
} else {
  pgClient = postgres(databaseUrl);
  db = pgDrizzle(pgClient, { schema }) as unknown as DBInstance;
}

export type DbType = typeof db;

export async function runTransaction<T>(
  cb: (tx: DBInstance) => Promise<T>
): Promise<T> {
  if (isSQLite) {
    const sqliteDb = db as unknown as LibSQLDatabase<typeof schema>;
    return await sqliteDb.transaction(cb as unknown as (tx: Parameters<Parameters<typeof sqliteDb.transaction>[0]>[0]) => Promise<T>) as unknown as T;
  } else {
    const pgDb = db as unknown as PostgresJsDatabase<typeof schema>;
    return await pgDb.transaction(cb as unknown as (tx: Parameters<Parameters<typeof pgDb.transaction>[0]>[0]) => Promise<T>);
  }
}


