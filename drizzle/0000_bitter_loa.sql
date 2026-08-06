CREATE TABLE `admin_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_by` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_idx` ON `admin_users` (`email`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text DEFAULT '' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `content_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`date` text DEFAULT '' NOT NULL,
	`time` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `content_items_kind_order_idx` ON `content_items` (`kind`,`sort_order`);--> statement-breakpoint
CREATE TABLE `prayer_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`encrypted_payload` text NOT NULL,
	`subject` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`source_ip_hash` text NOT NULL,
	`submitted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX `prayer_requests_status_date_idx` ON `prayer_requests` (`status`,`submitted_at`);--> statement-breakpoint
CREATE TABLE `submission_limits` (
	`ip_hash` text PRIMARY KEY NOT NULL,
	`window_started_at` integer NOT NULL,
	`submission_count` integer DEFAULT 0 NOT NULL
);
