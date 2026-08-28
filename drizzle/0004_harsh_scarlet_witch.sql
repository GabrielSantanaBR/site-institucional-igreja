CREATE TABLE `contact_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`access_hash` text NOT NULL,
	`encrypted_identity` text NOT NULL,
	`subject` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`source_ip_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_visitor_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_admin_at` text,
	`assigned_to` text
);
--> statement-breakpoint
CREATE INDEX `contact_conversations_status_date_idx` ON `contact_conversations` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `contact_limits` (
	`ip_hash` text PRIMARY KEY NOT NULL,
	`window_started_at` integer NOT NULL,
	`message_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contact_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` text NOT NULL,
	`sender` text NOT NULL,
	`encrypted_body` text NOT NULL,
	`author_name` text DEFAULT '' NOT NULL,
	`read_by_admin` integer DEFAULT false NOT NULL,
	`read_by_visitor` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contact_messages_conversation_date_idx` ON `contact_messages` (`conversation_id`,`created_at`);