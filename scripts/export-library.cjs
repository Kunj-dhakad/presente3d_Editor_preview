// One-time export of the editor's library catalogue (elements, backgrounds,
// text styles, templates) from the old book-editor database into
// data/library/<kind>.json, which the editor now reads instead of a database.
//
//   MYSQL_HOST=... MYSQL_USER=... MYSQL_PASSWORD=... MYSQL_DATABASE=FS_BookEditor node scripts/export-library.cjs
//
// Read-only: it only runs SELECT. Needs `npm i --no-save mysql2` if mysql2 is not installed.
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const mysql = require("mysql2/promise");
  for (const name of ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"]) {
    if (!process.env[name]) throw new Error(`${name} is required.`);
  }
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE,
  });
  const out = path.join(__dirname, "..", "data", "library");
  fs.mkdirSync(out, { recursive: true });
  try {
    for (const kind of ["element", "background", "text", "template"]) {
      const [rows] = await connection.query("SELECT id, title, data FROM library_items WHERE kind = ? ORDER BY created_at DESC", [kind]);
      const items = rows.map(row => ({ ...(typeof row.data === "string" ? JSON.parse(row.data) : row.data), library_id: row.id }));
      fs.writeFileSync(path.join(out, `${kind}.json`), JSON.stringify(items));
      console.log(`${kind}: ${items.length} item(s)`);
    }
  } finally {
    await connection.end();
  }
}
main().catch(error => { console.error("Export failed:", error.code || error.message); process.exitCode = 1; });
