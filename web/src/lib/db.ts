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

// node:sqlite returns rows with a null prototype, which Next will not pass to a
// client component. Copy them into plain objects at the edge.
const plain = <T>(row: Record<string, unknown>) => ({ ...row }) as T

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
    CREATE TABLE IF NOT EXISTS visuals (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      format     TEXT NOT NULL,
      spec       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS posts (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      title          TEXT NOT NULL,
      kind           TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'idea',
      scheduled_date TEXT,
      scheduled_time TEXT,
      caption        TEXT NOT NULL DEFAULT '',
      notes          TEXT NOT NULL DEFAULT '',
      visual_id      INTEGER REFERENCES visuals(id) ON DELETE SET NULL,
      created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS posts_date ON posts (scheduled_date);
  `)
  handle.exec("PRAGMA foreign_keys = ON")
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
    .all()
    .map((r) => plain<Draft>(r))
}

export function addDraft(skill: string, title: string, content: string) {
  const res = open().prepare("INSERT INTO drafts (skill, title, content) VALUES (?, ?, ?)").run(skill, title, content)
  return Number(res.lastInsertRowid)
}

export function deleteDraft(id: number) {
  open().prepare("DELETE FROM drafts WHERE id = ?").run(id)
}

// ---- visuals: saved slide sets --------------------------------------------

export type VisualRow = { id: number; title: string; format: string; spec: string; created_at: string; updated_at: string }

export function createVisual(title: string, format: string, spec: string) {
  const res = open().prepare("INSERT INTO visuals (title, format, spec) VALUES (?, ?, ?)").run(title, format, spec)
  return Number(res.lastInsertRowid)
}

export function getVisual(id: number): VisualRow | null {
  const row = open().prepare("SELECT * FROM visuals WHERE id = ?").get(id)
  return row ? plain<VisualRow>(row) : null
}

export function updateVisual(id: number, title: string, format: string, spec: string) {
  open()
    .prepare("UPDATE visuals SET title = ?, format = ?, spec = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?")
    .run(title, format, spec, id)
}

export function listVisuals(): VisualRow[] {
  return open()
    .prepare("SELECT * FROM visuals ORDER BY id DESC LIMIT 200")
    .all()
    .map((r) => plain<VisualRow>(r))
}

export function deleteVisual(id: number) {
  open().prepare("DELETE FROM visuals WHERE id = ?").run(id)
}

// ---- posts: the content calendar ------------------------------------------

export type PostRow = {
  id: number
  title: string
  kind: string
  status: string
  scheduled_date: string | null
  scheduled_time: string | null
  caption: string
  notes: string
  visual_id: number | null
  created_at: string
  updated_at: string
}
export type PostInput = Omit<PostRow, "id" | "created_at" | "updated_at">

export function listPosts(): PostRow[] {
  return open()
    .prepare("SELECT * FROM posts ORDER BY scheduled_date IS NULL, scheduled_date, scheduled_time IS NULL, scheduled_time, id")
    .all()
    .map((r) => plain<PostRow>(r))
}

export function addPost(p: PostInput) {
  const res = open()
    .prepare(
      "INSERT INTO posts (title, kind, status, scheduled_date, scheduled_time, caption, notes, visual_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(p.title, p.kind, p.status, p.scheduled_date, p.scheduled_time, p.caption, p.notes, p.visual_id)
  return Number(res.lastInsertRowid)
}

export function updatePost(id: number, p: PostInput) {
  open()
    .prepare(
      "UPDATE posts SET title = ?, kind = ?, status = ?, scheduled_date = ?, scheduled_time = ?, caption = ?, notes = ?, visual_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    )
    .run(p.title, p.kind, p.status, p.scheduled_date, p.scheduled_time, p.caption, p.notes, p.visual_id, id)
}

export function deletePost(id: number) {
  open().prepare("DELETE FROM posts WHERE id = ?").run(id)
}
