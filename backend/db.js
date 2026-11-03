
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(
  path.join(__dirname, "database.db")
);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    age_group TEXT NOT NULL DEFAULT 'adult',
    sensitivity TEXT NOT NULL DEFAULT 'neutral',
    transport TEXT NOT NULL DEFAULT 'walk',
    preferred_city TEXT NOT NULL DEFAULT 'København',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS favorite_cities (
    user_id INTEGER NOT NULL,
    city TEXT NOT NULL,
    PRIMARY KEY (user_id, city),
    FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE
  );
`);

module.exports = db;
