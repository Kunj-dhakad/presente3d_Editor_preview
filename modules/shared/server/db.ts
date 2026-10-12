import { createPool, type Pool } from "mysql2/promise";

const globalDb = globalThis as unknown as { fsBookPool?: Pool };

export const db = globalDb.fsBookPool ?? createPool({
  host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || "FS_BookEditor",
  // A remote database over an ordinary connection can take several seconds to
  // answer when it is busy; ten seconds was tight enough to fail requests.
  timezone: "Z", connectionLimit: 10, waitForConnections: true, charset: "utf8mb4", connectTimeout: 20000,
  // Networks between the app and the database (NAT gateways, load balancers,
  // office routers) drop idle TCP connections after a few minutes. Without
  // these, the pool hands out a dead socket and the request fails with
  // ECONNRESET — which shows up as "Failed to get session" on the first page
  // load after a quiet period.
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  idleTimeout: 60_000,
  maxIdle: 3,
});

if (!globalDb.fsBookPool) {
  // A socket that dies while idle emits on the pool. Without a listener Node
  // treats it as an unhandled 'error' event and kills the whole server.
  db.pool.on("error", error => console.error("AI Book Creator database pool error:", error.code || error.message));
  db.pool.on("connection", connection => connection.on("error", () => {}));
  globalDb.fsBookPool = db;
}
