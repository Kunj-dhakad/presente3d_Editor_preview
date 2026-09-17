CREATE TABLE IF NOT EXISTS books (
 id varchar(36) PRIMARY KEY, short_id char(8) NULL UNIQUE, user_id varchar(64) NOT NULL, title varchar(160) NOT NULL,
 document_key varchar(512) NOT NULL, version int unsigned NOT NULL DEFAULT 1,
 page_count int unsigned NOT NULL DEFAULT 1, deleted_at datetime(3) NULL,
 kind varchar(16) NOT NULL DEFAULT 'ai', published_at datetime(3) NULL, lead_form tinyint(1) NOT NULL DEFAULT 1,
 cover_key varchar(512) NULL, cover_hash char(64) NULL, page_hash char(64) NULL,
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX books_owner (user_id, deleted_at, updated_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS book_revisions (
 id varchar(36) PRIMARY KEY, book_id varchar(36) NOT NULL, document_key varchar(512) NOT NULL,
 version int unsigned NOT NULL, created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY revision_version (book_id, version), FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS assets (
 id varchar(36) PRIMARY KEY, user_id varchar(64) NOT NULL, object_key varchar(512) NOT NULL,
 kind varchar(32) NOT NULL, name varchar(255) NOT NULL, content_type varchar(128) NOT NULL,
 bytes bigint unsigned NOT NULL, deleted_at datetime(3) NULL,
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX asset_owner (user_id, kind, created_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS ai_jobs (
 id varchar(36) PRIMARY KEY, user_id varchar(64) NOT NULL, provider_id varchar(255) NOT NULL,
 status varchar(32) NOT NULL DEFAULT 'pending', prompt text NOT NULL, asset_id varchar(36) NULL,
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX job_owner (user_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS usage_limits (
 bucket_key varchar(190) PRIMARY KEY, user_id varchar(64) NOT NULL, scope varchar(32) NOT NULL,
 hits int unsigned NOT NULL, expires_at datetime NOT NULL, INDEX usage_expiry (expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS library_items (
 id varchar(36) PRIMARY KEY, kind varchar(32) NOT NULL, title varchar(160) NOT NULL,
 data json NOT NULL, created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX library_kind (kind)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS book_shares (
 token varchar(64) PRIMARY KEY, short_token char(10) NULL UNIQUE, book_id varchar(36) NOT NULL UNIQUE,
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS book_responses (
 id varchar(36) PRIMARY KEY, book_id varchar(36) NOT NULL, data json NOT NULL,
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX responses_book (book_id)
) ENGINE=InnoDB;
-- One row per reading session: a visitor returning within 30 minutes continues the same view.
CREATE TABLE IF NOT EXISTS book_views (
 id varchar(36) PRIMARY KEY, book_id varchar(36) NOT NULL, visitor char(64) NOT NULL,
 max_page int unsigned NOT NULL DEFAULT 1, total_pages int unsigned NOT NULL DEFAULT 1, completed tinyint(1) NOT NULL DEFAULT 0,
 started_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), last_seen_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX views_visit (book_id, visitor, last_seen_at), FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS book_ratings (
 id varchar(36) PRIMARY KEY, book_id varchar(36) NOT NULL, visitor char(64) NOT NULL,
 stars tinyint unsigned NOT NULL, comment varchar(500) NULL,
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY rating_visitor (book_id, visitor), FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_plans (
 user_id varchar(64) PRIMARY KEY, plan varchar(20) NOT NULL DEFAULT 'free',
 suspended_at datetime(3) NULL, suspend_reason varchar(255) NULL, note varchar(255) NULL,
 updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX plans_plan (plan)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS contact_messages (
 id varchar(36) PRIMARY KEY, user_id varchar(64) NULL, name varchar(100) NOT NULL, email varchar(254) NOT NULL,
 topic varchar(32) NOT NULL, message text NOT NULL, status varchar(16) NOT NULL DEFAULT 'open',
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX messages_status (status, created_at)
) ENGINE=InnoDB;
