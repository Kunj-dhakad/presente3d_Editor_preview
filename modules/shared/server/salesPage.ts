import { cache } from "react";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "./db";
import { ApiError } from "./api";
import { defaultSalesPage, parseSalesPage, type SalesPage, type SalesPageSnapshot } from "@shared/salesPage";

export const SALES_PAGE_SCHEMA = `CREATE TABLE IF NOT EXISTS sales_page (
  id tinyint unsigned PRIMARY KEY, draft_json longtext NULL, published_json longtext NULL,
  revision int unsigned NOT NULL DEFAULT 0, published_revision int unsigned NULL,
  updated_by varchar(36) NULL, updated_at datetime(3) NULL, published_at datetime(3) NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
export const SALES_MEDIA_SCHEMA = `CREATE TABLE IF NOT EXISTS sales_page_media (
  id char(36) PRIMARY KEY, storage_key varchar(512) NOT NULL, created_by varchar(36) NOT NULL,
  created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
let ready: Promise<void> | undefined;
export function ensureSalesPageSchema() {
  return ready ??= (async () => { await db.query(SALES_PAGE_SCHEMA); await db.query(SALES_MEDIA_SCHEMA); })().catch(error => { ready = undefined; throw error; });
}
const date = (value: unknown) => value ? new Date(String(value)).toISOString() : null;
function snapshot(row?: RowDataPacket): SalesPageSnapshot {
  return { draft: row?.draft_json ? parseSalesPage(JSON.parse(row.draft_json)) : defaultSalesPage(), revision: Number(row?.revision || 0), publishedRevision: row?.published_revision == null ? null : Number(row.published_revision), publishedAt: date(row?.published_at), updatedAt: date(row?.updated_at) };
}
export async function readSalesPage(): Promise<SalesPageSnapshot> {
  await ensureSalesPageSchema();
  const [rows] = await db.query<RowDataPacket[]>("SELECT * FROM sales_page WHERE id=1");
  return snapshot(rows[0]);
}
export async function writeSalesPage(document: SalesPage | null, expectedRevision: number, action: "save" | "publish" | "unpublish", adminId: string): Promise<SalesPageSnapshot> {
  await ensureSalesPageSchema();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("INSERT IGNORE INTO sales_page (id) VALUES (1)");
    const [rows] = await connection.query<RowDataPacket[]>("SELECT * FROM sales_page WHERE id=1 FOR UPDATE");
    const current = rows[0];
    if (Number(current.revision) !== expectedRevision) throw new ApiError(409, "This page was changed in another tab. Reload the saved draft before making more changes.");
    const revision = expectedRevision + 1;
    if (action === "unpublish") {
      await connection.execute<ResultSetHeader>("UPDATE sales_page SET published_json=NULL, published_revision=NULL, published_at=NULL, revision=?, updated_by=?, updated_at=UTC_TIMESTAMP(3) WHERE id=1", [revision, adminId]);
    } else {
      if (!document) throw new ApiError(400, "Page content is required.");
      const json = JSON.stringify(document);
      if (action === "publish") await connection.execute("UPDATE sales_page SET draft_json=?, published_json=?, revision=?, published_revision=?, updated_by=?, updated_at=UTC_TIMESTAMP(3), published_at=UTC_TIMESTAMP(3) WHERE id=1", [json, json, revision, revision, adminId]);
      else await connection.execute("UPDATE sales_page SET draft_json=?, revision=?, updated_by=?, updated_at=UTC_TIMESTAMP(3) WHERE id=1", [json, revision, adminId]);
    }
    const [updated] = await connection.query<RowDataPacket[]>("SELECT * FROM sales_page WHERE id=1");
    await connection.commit();
    return snapshot(updated[0]);
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

/** Request-scoped read shared by homepage rendering and its metadata. */
export const publishedSalesPage = cache(async (): Promise<SalesPage | null> => {
  try {
    const [rows] = await db.query<RowDataPacket[]>("SELECT published_json FROM sales_page WHERE id=1");
    return rows[0]?.published_json ? parseSalesPage(JSON.parse(rows[0].published_json)) : null;
  } catch (error) {
    if ((error as { code?: string }).code !== "ER_NO_SUCH_TABLE") console.error("Could not read published sales page", error instanceof Error ? error.message : "Database error");
    return null;
  }
});
