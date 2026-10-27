import "server-only"
import fs from "node:fs"
import path from "node:path"

// Node's built-in SQLite: no native module to build or ship. It is loaded at
// runtime so the bundler leaves it alone, and the types are the few calls used.
type Statement = {
  all(...params: unknown[]): Record<string, unknown>[]
  get(...params: unknown[]): Record<string, unknown> | undefined
  run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint }
}
type Database = { exec(sql: string): void; prepare(sql: string): Statement }

const DATA_DIR = process.env.DATA_DIR ?? path.resolve(process.cwd(), ".data")

let db: Database | undefined

function open(): Database {
  if (db) return db
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const sqlite = process.getBuiltinModule("node:sqlite") as {
    DatabaseSync: new (file: string) => Database
  }
  const handle = new sqlite.DatabaseSync(path.join(DATA_DIR, "studio.db"))
  handle.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS drafts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      skill      TEXT NOT NULL,
      title      TEXT NOT NULL,
      content    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `)
  db = handle
  return handle
}

export function getSetting(key: string): string | null {
  const row = open().prepare("SELECT value FROM settings WHERE key = ?").get(key)
  return row ? String(row.value) : null
}

export function setSetting(key: string, value: string) {
  open()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, value)
}

export type Draft = { id: number; skill: string; title: string; content: string; created_at: string }

export function listDrafts(): Draft[] {
  return open()
    .prepare("SELECT id, skill, title, content, created_at FROM drafts ORDER BY id DESC LIMIT 500")
    .all() as Draft[]
}

export function addDraft(skill: string, title: string, content: string) {
  const res = open().prepare("INSERT INTO drafts (skill, title, content) VALUES (?, ?, ?)").run(skill, title, content)
  return Number(res.lastInsertRowid)
}

export function deleteDraft(id: number) {
  open().prepare("DELETE FROM drafts WHERE id = ?").run(id)
}
