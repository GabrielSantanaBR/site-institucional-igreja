CREATE TABLE `admin_login_limits` (
	`ip_hash` text PRIMARY KEY NOT NULL,
	`window_started_at` integer NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `content_items` ADD `image_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `content_items` ADD `link_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `content_items` ADD `author` text DEFAULT '' NOT NULL;