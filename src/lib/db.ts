import Database from 'better-sqlite3';
import path from 'path';

// Use /tmp in production (Vercel read-only filesystem), local folder in dev
const dbPath = process.env.NODE_ENV === 'production'
  ? '/tmp/debates.db'
  : path.join(process.cwd(), 'debates.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Define the Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pro_model TEXT NOT NULL,
    anti_model TEXT NOT NULL,
    topic TEXT NOT NULL,
    status TEXT NOT NULL, -- 'generating', 'voting', 'completed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS arguments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id INTEGER NOT NULL,
    model TEXT NOT NULL,
    side TEXT NOT NULL, -- 'PRO' or 'ANTI'
    content TEXT NOT NULL,
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id INTEGER NOT NULL,
    voter_model TEXT NOT NULL,
    voted_for TEXT NOT NULL, -- 'PRO' or 'ANTI'
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
  );
`);

/**
 * Enforces the 25-history limit by deleting the oldest completed rounds
 * if we exceed 25 'completed' rounds total.
 */
export function enforceHistoryLimit() {
  const count = db.prepare(`SELECT count(*) as total FROM rounds WHERE status = 'completed'`).get() as { total: number };
  if (count.total > 25) {
    const toDelete = count.total - 25;
    // Delete the oldest N completed rounds 
    // Wait for cascading deletes to handle arguments and votes automatically
    db.prepare(`
      DELETE FROM rounds 
      WHERE id IN (
        SELECT id FROM rounds 
        WHERE status = 'completed' 
        ORDER BY created_at ASC 
        LIMIT ?
      )
    `).run(toDelete);
  }
}

export default db;
