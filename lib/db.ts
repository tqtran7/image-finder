import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Single shared SQLite connection for the whole app.
 *
 * The DB lives at ./data/icons.db (gitignored). The schema is created on first
 * access and is idempotent, so importing this module is enough to guarantee the
 * tables exist. We cache the connection on globalThis so Next's dev-mode module
 * reloading doesn't open a new handle on every hot reload.
 */

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "icons.db");

type DB = Database.Database;

const globalForDb = globalThis as unknown as { __iconDb?: DB };

function createDb(): DB {
  mkdirSync(DB_DIR, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  migrate(db);
  return db;
}

function migrate(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roots (
      id              INTEGER PRIMARY KEY,
      path            TEXT UNIQUE NOT NULL,
      label           TEXT,
      added_at        INTEGER,
      last_scanned_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS images (
      id           INTEGER PRIMARY KEY,
      root_id      INTEGER NOT NULL REFERENCES roots(id) ON DELETE CASCADE,
      abs_path     TEXT UNIQUE NOT NULL,
      rel_path     TEXT NOT NULL,
      filename     TEXT NOT NULL,
      ext          TEXT NOT NULL,
      size         INTEGER,
      mtime        INTEGER,
      content_hash TEXT,
      width        INTEGER,
      height       INTEGER,
      indexed_at   INTEGER,
      missing_at   INTEGER
    );

    CREATE TABLE IF NOT EXISTS tags (
      id   INTEGER PRIMARY KEY,
      name TEXT UNIQUE COLLATE NOCASE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS image_tags (
      image_id   INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
      tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      source     TEXT NOT NULL,            -- 'manual' | 'ai' | 'filename'
      confidence REAL,
      created_at INTEGER,
      PRIMARY KEY (image_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS tag_suggestions (
      id         INTEGER PRIMARY KEY,
      image_id   INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      confidence REAL,
      model      TEXT,
      created_at INTEGER,
      status     TEXT NOT NULL DEFAULT 'pending'  -- 'pending' | 'accepted' | 'rejected'
    );

    CREATE INDEX IF NOT EXISTS idx_image_tags_tag   ON image_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_image_tags_image ON image_tags(image_id);
    CREATE INDEX IF NOT EXISTS idx_images_root      ON images(root_id);
    CREATE INDEX IF NOT EXISTS idx_images_hash      ON images(content_hash);
    CREATE INDEX IF NOT EXISTS idx_tags_name        ON tags(name);
    CREATE INDEX IF NOT EXISTS idx_suggestions_img  ON tag_suggestions(image_id);
  `);
}

export function getDb(): DB {
  if (!globalForDb.__iconDb) {
    globalForDb.__iconDb = createDb();
  }
  return globalForDb.__iconDb;
}

export { DB_PATH };
