import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema.js";
import { ensureSchema } from "./migrate.js";

export type Db = BetterSQLite3Database<typeof schema>;

let cached: { db: Db; sqlite: Database.Database } | null = null;

export function resolveDbPath(path?: string): string {
  const p = path ?? process.env["CAREER_DB_PATH"] ?? "./data/career.db";
  return p === ":memory:" ? p : resolve(process.cwd(), p);
}

/** Abre (ou reutiliza) a conexão SQLite e garante o schema. */
export function openDb(path?: string): Db {
  if (cached && !path) return cached.db;
  const file = resolveDbPath(path);
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  ensureSchema(sqlite);
  const db = drizzle(sqlite, { schema });
  if (!path) cached = { db, sqlite };
  return db;
}

export function closeDb() {
  cached?.sqlite.close();
  cached = null;
}
