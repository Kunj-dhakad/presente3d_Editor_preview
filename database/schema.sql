CREATE TABLE IF NOT EXISTS sales_page (
  id tinyint unsigned PRIMARY KEY, draft_json longtext NULL, published_json longtext NULL,
  revision int unsigned NOT NULL DEFAULT 0, published_revision int unsigned NULL,
  updated_by varchar(36) NULL, updated_at datetime(3) NULL, published_at datetime(3) NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS sales_page_media (
  id char(36) PRIMARY KEY, storage_key varchar(512) NOT NULL, created_by varchar(36) NOT NULL,
  created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
 -- What the BMS worked out this account may do, written whenever a purchase changes.
 user_package longtext NULL,
 suspended_at datetime(3) NULL, suspend_reason varchar(255) NULL, note varchar(255) NULL,
 updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX plans_plan (plan)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS contact_messages (
 id varchar(36) PRIMARY KEY, user_id varchar(64) NULL, name varchar(100) NOT NULL, email varchar(254) NOT NULL,
 topic varchar(32) NOT NULL, message text NOT NULL, status varchar(16) NOT NULL DEFAULT 'open',
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX messages_status (status, created_at)
) ENGINE=InnoDB;
-- Administration. Its own accounts and sessions: an admin is never a site user,
-- and a site account can never reach the panel.
CREATE TABLE IF NOT EXISTS admin_users (
 id varchar(36) PRIMARY KEY, email varchar(254) NOT NULL UNIQUE, name varchar(100) NOT NULL,
 password_hash varchar(255) NOT NULL, role varchar(16) NOT NULL DEFAULT 'manager',
 disabled_at datetime(3) NULL, last_login_at datetime(3) NULL, created_by varchar(36) NULL,
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX admins_role (role)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS admin_sessions (
 token char(64) PRIMARY KEY, admin_id varchar(36) NOT NULL, expires_at datetime(3) NOT NULL,
 ip varchar(64) NULL, agent varchar(255) NULL,
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX admin_sessions_admin (admin_id, expires_at)
) ENGINE=InnoDB;
-- Orders an administrator records. Marking one paid activates the plan on the site.
CREATE TABLE IF NOT EXISTS orders (
 id varchar(36) PRIMARY KEY, number varchar(20) NOT NULL UNIQUE, user_id varchar(64) NOT NULL, email varchar(254) NOT NULL,
 plan varchar(20) NOT NULL, amount_cents int NOT NULL DEFAULT 0, currency char(3) NOT NULL DEFAULT 'USD',
 months int NOT NULL DEFAULT 1, status varchar(16) NOT NULL DEFAULT 'pending', method varchar(32) NULL,
 reference varchar(80) NULL, note varchar(500) NULL, created_by varchar(36) NULL,
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), paid_at datetime(3) NULL,
 updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 INDEX orders_user (user_id, created_at), INDEX orders_status (status, created_at)
) ENGINE=InnoDB;
-- Every email the site sends, editable in the panel.
CREATE TABLE IF NOT EXISTS email_templates (
 id varchar(40) PRIMARY KEY, subject varchar(200) NOT NULL, heading varchar(200) NOT NULL, body text NOT NULL,
 action_label varchar(80) NULL, footer varchar(300) NULL, enabled tinyint(1) NOT NULL DEFAULT 1,
 updated_by varchar(36) NULL, updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;
-- What the site sent, so the panel can show it.
CREATE TABLE IF NOT EXISTS email_log (
 id varchar(36) PRIMARY KEY, template varchar(40) NOT NULL, recipient varchar(254) NOT NULL, subject varchar(200) NOT NULL,
 status varchar(16) NOT NULL DEFAULT 'sent', error varchar(255) NULL, admin_id varchar(36) NULL,
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX email_log_when (created_at), INDEX email_log_template (template, created_at)
) ENGINE=InnoDB;
-- ---------------------------------------------------------------------------
-- The Business Management System, table for table as the reference runs it.
--
--   tbl_apps            one row per product this BMS sells for
--   tbl_features        what a package can switch on, named by condition_val
--   tbl_feature_plans   a named set of feature ids, shared by several packages
--   tbl_package_fields  the countable allowances, also named by condition_val
--   tbl_package_plans   a package: a feature plan plus a value for each field
--   tbl_package_purchase  a copy of the package as it was sold, and these stack
--   tbl_package_order   what was ordered, and whether it was paid
--   tbl_package_transaction  the payment behind an order
--
-- The reference stores the JSON columns with PHP serialize. Here they are
-- JSON, which is the same data in a form this server can read.
CREATE TABLE IF NOT EXISTS tbl_apps (
 id int AUTO_INCREMENT PRIMARY KEY, app_name varchar(255) NOT NULL,
 status enum('active','inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS tbl_features (
 id int AUTO_INCREMENT PRIMARY KEY, app_id int NOT NULL, feature varchar(255) NOT NULL,
 condition_val varchar(255) NOT NULL, area varchar(40) NOT NULL DEFAULT 'app', description varchar(255) NULL,
 sort int NOT NULL DEFAULT 0, status enum('active','inactive') NOT NULL DEFAULT 'active',
 add_time int NOT NULL DEFAULT 0,
 UNIQUE KEY features_condition (app_id, condition_val), INDEX features_app (app_id, sort)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS tbl_feature_plans (
 id int AUTO_INCREMENT PRIMARY KEY, plan_name varchar(255) NOT NULL,
 -- ["1","4","7"]: the feature ids this set switches on.
 feature_ids longtext NOT NULL, status enum('active','inactive') NOT NULL DEFAULT 'active',
 updated_by varchar(36) NULL, add_time int NOT NULL DEFAULT 0
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS tbl_package_fields (
 id int AUTO_INCREMENT PRIMARY KEY, field_name varchar(255) NOT NULL, condition_val varchar(255) NOT NULL,
 app_id int NOT NULL, overages enum('yes','no') NOT NULL DEFAULT 'no',
 input_type enum('text','select') NOT NULL DEFAULT 'text', input_val text NOT NULL,
 -- data: an allowance the app counts. validity: how long the package lasts.
 field_type enum('data','validity','none') NOT NULL DEFAULT 'data',
 unit varchar(20) NOT NULL DEFAULT 'count', period varchar(10) NOT NULL DEFAULT 'total',
 sort int NOT NULL DEFAULT 0, status enum('active','inactive') NOT NULL DEFAULT 'active',
 UNIQUE KEY fields_condition (app_id, condition_val)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS tbl_package_plans (
 id int AUTO_INCREMENT PRIMARY KEY, title varchar(255) NOT NULL, slug varchar(60) NOT NULL UNIQUE,
 blurb varchar(255) NULL, app_ids varchar(255) NOT NULL,
 -- {"1":{"3":["50"]}}: app id, then field id, then the value. "unlimited" is a value.
 fields longtext NOT NULL, overages longtext NULL,
 plan_type enum('free','paid') NOT NULL DEFAULT 'paid',
 plan_level enum('free','fe','upsell') NOT NULL DEFAULT 'fe',
 price float NOT NULL DEFAULT 0, currency char(3) NOT NULL DEFAULT 'USD', period varchar(10) NOT NULL DEFAULT 'month',
 sell_type varchar(40) NULL, feature_plan int NULL, highlights longtext NULL,
 -- Product ids at each marketplace, for the day sales arrive on their own.
 jvz_product_id varchar(255) NULL, wp_product_id varchar(255) NULL, cb_product_id varchar(255) NULL,
 `public` tinyint(1) NOT NULL DEFAULT 1, highlight tinyint(1) NOT NULL DEFAULT 0, sort int NOT NULL DEFAULT 0,
 status enum('active','inactive') NOT NULL DEFAULT 'active', updated_by varchar(36) NULL,
 add_time int NOT NULL DEFAULT 0, INDEX packages_public (status, `public`, sort)
) ENGINE=InnoDB;
-- What a customer owns: the package as it was on the day it was sold. Several
-- rows stack — unlimited wins, otherwise the larger number does.
CREATE TABLE IF NOT EXISTS tbl_package_purchase (
 id int AUTO_INCREMENT PRIMARY KEY, user_id varchar(64) NOT NULL, transaction_id int NULL,
 package_id int NOT NULL, order_id int NULL, title varchar(255) NOT NULL, app_ids varchar(255) NOT NULL,
 fields longtext NOT NULL, overages longtext NULL,
 plan_type enum('free','paid') NOT NULL DEFAULT 'paid',
 plan_level enum('free','fe','upsell') NOT NULL DEFAULT 'fe',
 price float NOT NULL DEFAULT 0, sell_type varchar(40) NULL, feature_plan int NULL,
 source varchar(20) NOT NULL DEFAULT 'admin', note varchar(255) NULL, created_by varchar(36) NULL,
 status enum('active','inactive') NOT NULL DEFAULT 'active',
 add_time int NOT NULL DEFAULT 0, expire_time int NULL,
 INDEX purchase_user (user_id, status), INDEX purchase_package (package_id)
) ENGINE=InnoDB;
-- An order an administrator records, or a sale that arrives from a marketplace.
-- Completing one writes the purchase above.
CREATE TABLE IF NOT EXISTS tbl_package_order (
 id int AUTO_INCREMENT PRIMARY KEY, number varchar(20) NOT NULL UNIQUE, package_id int NULL, trans_id int NULL,
 purchase_id int NULL, user_id varchar(64) NOT NULL, user_email varchar(254) NOT NULL,
 price float NOT NULL DEFAULT 0, currency char(3) NOT NULL DEFAULT 'USD', months int NOT NULL DEFAULT 1,
 payment_mode varchar(32) NULL, payment_status enum('new','process','complete','pending','free','refunded','cancelled') NOT NULL DEFAULT 'pending',
 reference varchar(80) NULL, message varchar(500) NULL, created_by varchar(36) NULL,
 order_time int NOT NULL DEFAULT 0, paid_time int NULL,
 INDEX order_user (user_id, order_time), INDEX order_status (payment_status, order_time)
) ENGINE=InnoDB;
-- The payment itself, when one arrives from a marketplace.
CREATE TABLE IF NOT EXISTS tbl_package_transaction (
 id int AUTO_INCREMENT PRIMARY KEY, purchase_id int NULL, user_id varchar(64) NULL,
 transaction_from varchar(32) NOT NULL DEFAULT 'BMS', transaction_type varchar(255) NULL,
 name varchar(255) NULL, email varchar(255) NULL, country varchar(255) NULL, item varchar(200) NULL,
 type varchar(255) NULL, amount float NOT NULL DEFAULT 0, receipt varchar(255) NULL,
 response longtext NULL, add_time int NOT NULL DEFAULT 0,
 INDEX transaction_user (user_id, add_time)
) ENGINE=InnoDB;
-- Plans, in the shape a business runs them: what a package switches on
-- (features), how much of it a customer gets (limits), and what each customer
-- has actually bought (packages stack, so an upsell adds to what they own).
CREATE TABLE IF NOT EXISTS features (
 id varchar(36) PRIMARY KEY, `key` varchar(60) NOT NULL UNIQUE, name varchar(120) NOT NULL,
 area varchar(40) NOT NULL DEFAULT 'app', description varchar(255) NULL, sort int NOT NULL DEFAULT 0,
 status varchar(10) NOT NULL DEFAULT 'active',
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX features_area (area, sort)
) ENGINE=InnoDB;
-- A named set of features, so several packages can share one list.
CREATE TABLE IF NOT EXISTS feature_plans (
 id varchar(36) PRIMARY KEY, name varchar(120) NOT NULL, feature_keys text NOT NULL,
 status varchar(10) NOT NULL DEFAULT 'active', updated_by varchar(36) NULL,
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;
-- The countable things a package hands out: books, AI actions a day, storage.
CREATE TABLE IF NOT EXISTS plan_fields (
 id varchar(36) PRIMARY KEY, `key` varchar(60) NOT NULL UNIQUE, name varchar(120) NOT NULL,
 unit varchar(20) NOT NULL DEFAULT 'count', period varchar(10) NOT NULL DEFAULT 'total',
 overages tinyint(1) NOT NULL DEFAULT 0, sort int NOT NULL DEFAULT 0,
 status varchar(10) NOT NULL DEFAULT 'active',
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS packages (
 id varchar(36) PRIMARY KEY, slug varchar(60) NOT NULL UNIQUE, title varchar(120) NOT NULL, blurb varchar(255) NULL,
 level varchar(10) NOT NULL DEFAULT 'fe', price_cents int NOT NULL DEFAULT 0, currency char(3) NOT NULL DEFAULT 'USD',
 period varchar(10) NOT NULL DEFAULT 'month', feature_plan_id varchar(36) NULL,
 -- {"books": 50, "ai_daily": 600}: a missing key gives nothing, null means unlimited.
 limits text NOT NULL, highlights text NULL,
 -- Product ids at each marketplace, for the day sales arrive on their own.
 marketplace text NULL,
 `public` tinyint(1) NOT NULL DEFAULT 1, highlight tinyint(1) NOT NULL DEFAULT 0, sort int NOT NULL DEFAULT 0,
 status varchar(10) NOT NULL DEFAULT 'active', updated_by varchar(36) NULL,
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 INDEX packages_public (status, `public`, sort)
) ENGINE=InnoDB;
-- What a customer owns. Several rows stack: the most generous limit wins.
CREATE TABLE IF NOT EXISTS user_packages (
 id varchar(36) PRIMARY KEY, user_id varchar(64) NOT NULL, package_id varchar(36) NOT NULL, order_id varchar(36) NULL,
 source varchar(20) NOT NULL DEFAULT 'admin', status varchar(10) NOT NULL DEFAULT 'active',
 starts_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), ends_at datetime(3) NULL,
 limits text NULL, note varchar(255) NULL, created_by varchar(36) NULL,
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX user_packages_user (user_id, status), INDEX user_packages_package (package_id)
) ENGINE=InnoDB;
