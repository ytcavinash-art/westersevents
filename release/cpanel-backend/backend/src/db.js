import { DatabaseSync as Database } from "node:sqlite";
import fs from "fs";
import path from "path";

const databasePath = path.resolve(process.env.DATABASE_PATH || "data/westers.db");
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(databasePath);
db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");

db.exec(`
CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date TEXT,
  guests INTEGER,
  location TEXT,
  budget TEXT,
  details TEXT,
  verify_channel TEXT NOT NULL DEFAULT 'sms',
  verified INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'NEW',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS deliveries (
  request_id TEXT NOT NULL REFERENCES enquiries(request_id),
  channel TEXT NOT NULL CHECK(channel IN ('email','whatsapp')),
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(request_id,channel)
);
CREATE TABLE IF NOT EXISTS request_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
`);
export default db;

