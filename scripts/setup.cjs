const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
require("@next/env").loadEnvConfig(process.cwd());
async function main() {
  const mysql = require("mysql2/promise");
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, connectTimeout: 10000,
  });
  try {
    await connection.query("CREATE DATABASE IF NOT EXISTS FS_BookEditor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    await connection.query("USE FS_BookEditor");
    const schema = fs.readFileSync(path.join(process.cwd(), "database/schema.sql"), "utf8");
    for (const statement of schema.split(";").filter(s => s.trim())) await connection.query(statement);
    // Older installs created books before short ids existed.
    const [columns] = await connection.query("SHOW COLUMNS FROM books LIKE 'short_id'");
    if (!columns.length) {
      await connection.query("ALTER TABLE books ADD COLUMN short_id char(8) NULL UNIQUE AFTER id");
      console.log("Added short book links.");
    }
    const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
    const shortId = () => Array.from(crypto.randomBytes(8), b => alphabet[b % alphabet.length]).join("");
    const [pending] = await connection.query("SELECT id FROM books WHERE short_id IS NULL");
    for (const row of pending) {
      for (let attempt = 0; attempt < 5; attempt++) {
        try { await connection.query("UPDATE books SET short_id = ? WHERE id = ?", [shortId(), row.id]); break; }
        catch (error) { if (error.code !== "ER_DUP_ENTRY") throw error; }
      }
    }
    if (pending.length) console.log("Gave " + pending.length + " existing book(s) a short link.");
    // Reader links get a short code of their own; the long token keeps working.
    const [shareColumns] = await connection.query("SHOW COLUMNS FROM book_shares LIKE 'short_token'");
    if (!shareColumns.length) {
      await connection.query("ALTER TABLE book_shares ADD COLUMN short_token char(10) NULL UNIQUE AFTER token");
      console.log("Added short reader links.");
    }
    const shareCode = () => Array.from(crypto.randomBytes(10), b => alphabet[b % alphabet.length]).join("");
    const [openShares] = await connection.query("SELECT token FROM book_shares WHERE short_token IS NULL");
    for (const row of openShares) {
      for (let attempt = 0; attempt < 5; attempt++) {
        try { await connection.query("UPDATE book_shares SET short_token = ? WHERE token = ?", [shareCode(), row.token]); break; }
        catch (error) { if (error.code !== "ER_DUP_ENTRY") throw error; }
      }
    }
    if (openShares.length) console.log("Gave " + openShares.length + " published book(s) a short reader link.");
    // Book type, publishing, lead form and cover columns (added after launch).
    const bookColumns = [
      ["kind", "varchar(16) NOT NULL DEFAULT 'ai'"],
      ["published_at", "datetime(3) NULL"],
      ["lead_form", "tinyint(1) NOT NULL DEFAULT 1"],
      ["cover_key", "varchar(512) NULL"],
      ["cover_hash", "char(64) NULL"],
      ["page_hash", "char(64) NULL"],
    ];
    for (const [name, definition] of bookColumns) {
      const [found] = await connection.query("SHOW COLUMNS FROM books LIKE ?", [name]);
      if (!found.length) { await connection.query(`ALTER TABLE books ADD COLUMN ${name} ${definition}`); console.log("Added books." + name + "."); }
    }
    // Books that were already shared count as published.
    const [published] = await connection.query("UPDATE books b JOIN book_shares s ON s.book_id = b.id SET b.published_at = s.created_at WHERE b.published_at IS NULL");
    if (published.affectedRows) console.log("Marked " + published.affectedRows + " shared book(s) as published.");
    console.log("FS_BookEditor database and application tables are ready.");
  } finally { await connection.end(); }
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: "FS_BookEditor", timezone: "Z",
  });
  try {
    const { betterAuth } = await import("better-auth");
    const migrationAuth = betterAuth({
      database: pool, emailAndPassword: { enabled: true },
      rateLimit: { enabled: true, storage: "database" },
    });
    await (await migrationAuth.$context).runMigrations();
    console.log("Authentication tables are ready.");
    await pool.query("INSERT IGNORE INTO user_plans (user_id, plan) SELECT id, 'free' FROM `user`");
    console.log("Existing accounts have a plan.");
    // Everything lives in this one database. The editor reads its library from
    // library_items, so rows loaded into the library tables below are copied
    // across; running setup again only adds rows that are new.
    for (const [table, kind] of [["templates", "template"], ["text_templates", "text"], ["elements", "element"], ["bg_images", "background"]]) {
      const [exists] = await pool.query("SHOW TABLES LIKE ?", [table]);
      if (!exists.length) continue;
      const [rows] = await pool.query("SELECT * FROM ??", [table]);
      let added = 0;
      for (const row of rows) {
        const id = crypto.createHash("sha256").update(kind + ":" + row.id).digest("hex").slice(0, 36);
        const [result] = await pool.execute("INSERT IGNORE INTO library_items (id, kind, title, data) VALUES (?, ?, ?, ?)", [id, kind, String(row.title || row.name || kind).slice(0, 160), JSON.stringify(row)]);
        added += result.affectedRows;
      }
      console.log(`Library ${kind}: ${rows.length} in ${table}, ${added} newly added.`);
    }
  } finally { await pool.end(); }
}
main().catch(error => { console.error("Setup failed:", error.code || error.message); process.exitCode = 1; });
