CREATE TABLE `content_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`cover_image_url` text DEFAULT '' NOT NULL,
	`cover_image_position` text DEFAULT 'center' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_groups_name_idx` ON `content_groups` (`name`);--> statement-breakpoint
CREATE INDEX `content_groups_order_idx` ON `content_groups` (`sort_order`);--> statement-breakpoint
ALTER TABLE `content_items` ADD `group_id` integer;--> statement-breakpoint
ALTER TABLE `content_items` ADD `image_position` text DEFAULT 'center' NOT NULL;--> statement-breakpoint
CREATE INDEX `content_items_group_idx` ON `content_items` (`group_id`,`sort_order`);