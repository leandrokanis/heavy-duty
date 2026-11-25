CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`notice_key` text NOT NULL,
	`kind` text NOT NULL,
	`channel` text NOT NULL,
	`letter` text,
	`muscle_group_slugs` text NOT NULL,
	`due_at` text NOT NULL,
	`event_at` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text,
	`error` text,
	`finished_at` text,
	CONSTRAINT "notifications_kind_check" CHECK("notifications"."kind" IN ('window_open', 'window_close', 'level_drop')),
	CONSTRAINT "notifications_channel_check" CHECK("notifications"."channel" IN ('push', 'email')),
	CONSTRAINT "notifications_status_check" CHECK("notifications"."status" IS NULL OR "notifications"."status" IN ('sent', 'failed', 'skipped'))
);
--> statement-breakpoint
CREATE INDEX `notifications_channel_created_at_idx` ON `notifications` (`channel`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_notice_key_channel_unique` ON `notifications` (`notice_key`,`channel`);