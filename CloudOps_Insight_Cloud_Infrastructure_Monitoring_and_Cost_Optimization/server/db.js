/**
 * db.js — sqlite3 singleton + promisified helpers + schema bootstrap
 * Creates cloudops.db in server/ on first run.
 */
const sqlite3 = require('sqlite3').verbose();
const path    = require('path');

const DB_PATH = path.join(__dirname, 'cloudops.db');
const db      = new sqlite3.Database(DB_PATH);

// Promisified wrappers — use these everywhere instead of raw callbacks
db.runAsync  = (sql, params = []) => new Promise((res, rej) => db.run(sql,  params, function(err) { if (err) rej(err); else res(this); }));
db.getAsync  = (sql, params = []) => new Promise((res, rej) => db.get(sql,  params, (err, row)  => { if (err) rej(err); else res(row); }));
db.allAsync  = (sql, params = []) => new Promise((res, rej) => db.all(sql,  params, (err, rows) => { if (err) rej(err); else res(rows); }));
db.execAsync = (sql)              => new Promise((res, rej) => db.exec(sql,          (err)       => { if (err) rej(err); else res(); }));

// Bootstrap schema on first run
async function initSchema() {
  await db.runAsync('PRAGMA journal_mode = WAL');
  await db.runAsync('PRAGMA foreign_keys = ON');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      email           TEXT NOT NULL UNIQUE,
      password_hash   TEXT NOT NULL,
      role            TEXT NOT NULL DEFAULT 'viewer',
      avatar_initials TEXT NOT NULL DEFAULT '',
      avatar_color    TEXT NOT NULL DEFAULT '#EF5350',
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resources (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      type            TEXT NOT NULL,
      region          TEXT NOT NULL,
      status          TEXT NOT NULL,
      uptime_percent  REAL NOT NULL DEFAULT 100,
      cost_per_month  REAL NOT NULL DEFAULT 0,
      cpu_avg_7d      REAL NOT NULL DEFAULT 0,
      mem_avg_7d      REAL NOT NULL DEFAULT 0,
      tier            TEXT NOT NULL DEFAULT '',
      tags            TEXT NOT NULL DEFAULT '{}',
      created_at      TEXT NOT NULL,
      last_modified   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cost_entries (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      date         TEXT NOT NULL,
      resource_id  TEXT NOT NULL,
      service_type TEXT NOT NULL,
      region       TEXT NOT NULL,
      cost         REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cost_date     ON cost_entries(date);
    CREATE INDEX IF NOT EXISTS idx_cost_resource ON cost_entries(resource_id);

    CREATE TABLE IF NOT EXISTS recommendations (
      id                        TEXT PRIMARY KEY,
      type                      TEXT NOT NULL,
      severity                  TEXT NOT NULL,
      status                    TEXT NOT NULL DEFAULT 'open',
      title                     TEXT NOT NULL,
      description               TEXT NOT NULL,
      affected_resource_ids     TEXT NOT NULL DEFAULT '[]',
      estimated_monthly_savings REAL NOT NULL DEFAULT 0,
      created_at                TEXT NOT NULL,
      resolved_at               TEXT,
      anomaly_id                TEXT
    );

    CREATE TABLE IF NOT EXISTS anomalies (
      id             TEXT PRIMARY KEY,
      resource_id    TEXT NOT NULL,
      date           TEXT NOT NULL,
      actual_cost    REAL NOT NULL,
      expected_cost  REAL NOT NULL,
      std_dev        REAL NOT NULL,
      z_score        REAL NOT NULL,
      percent_change REAL NOT NULL,
      severity       TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'open',
      explanation    TEXT NOT NULL,
      created_at     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id                TEXT PRIMARY KEY,
      title             TEXT NOT NULL,
      description       TEXT NOT NULL,
      category          TEXT NOT NULL,
      last_generated_at TEXT NOT NULL,
      estimated_rows    INTEGER NOT NULL DEFAULT 0
    );
  `);
}

// Run schema init synchronously via serialize so routes wait for it
db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'viewer',
      avatar_initials TEXT NOT NULL DEFAULT '', avatar_color TEXT NOT NULL DEFAULT '#EF5350',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, region TEXT NOT NULL,
      status TEXT NOT NULL, uptime_percent REAL NOT NULL DEFAULT 100,
      cost_per_month REAL NOT NULL DEFAULT 0, cpu_avg_7d REAL NOT NULL DEFAULT 0,
      mem_avg_7d REAL NOT NULL DEFAULT 0, tier TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, last_modified TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cost_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL,
      resource_id TEXT NOT NULL, service_type TEXT NOT NULL, region TEXT NOT NULL, cost REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cost_date     ON cost_entries(date);
    CREATE INDEX IF NOT EXISTS idx_cost_resource ON cost_entries(resource_id);
    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open', title TEXT NOT NULL, description TEXT NOT NULL,
      affected_resource_ids TEXT NOT NULL DEFAULT '[]',
      estimated_monthly_savings REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, resolved_at TEXT, anomaly_id TEXT
    );
    CREATE TABLE IF NOT EXISTS anomalies (
      id TEXT PRIMARY KEY, resource_id TEXT NOT NULL, date TEXT NOT NULL,
      actual_cost REAL NOT NULL, expected_cost REAL NOT NULL, std_dev REAL NOT NULL,
      z_score REAL NOT NULL, percent_change REAL NOT NULL, severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open', explanation TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
      category TEXT NOT NULL, last_generated_at TEXT NOT NULL, estimated_rows INTEGER NOT NULL DEFAULT 0
    );
  `);
});

module.exports = db;
