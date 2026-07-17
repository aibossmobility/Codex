import Database from "better-sqlite3";

const dbPath = process.env.TEST_DB_PATH;
if (!dbPath) throw new Error("TEST_DB_PATH is required");
const db = new Database(dbPath, { readonly: true });
const rows = db.prepare("SELECT id, title, sort_order, created_at FROM courses ORDER BY id ASC").all();
console.log(JSON.stringify(rows, null, 2));
db.close();
