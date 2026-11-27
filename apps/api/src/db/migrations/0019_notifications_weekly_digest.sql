PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`notice_key` text NOT NULL,
	`kind` text NOT NULL,
	`channel` text NOT NULL,
	`letter` text,
	`muscle_group_slugs` text,
	`due_at` text NOT NULL,
	`event_at` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text,
	`error` text,
	`finished_at` text,
	`unsubscribe_token_hash` text,
	CONSTRAINT "notifications_kind_check" CHECK("__new_notifications"."kind" IN ('window_open', 'window_close', 'level_drop', 'weekly_digest')),
	CONSTRAINT "notifications_channel_check" CHECK("__new_notifications"."channel" IN ('push', 'email')),
	CONSTRAINT "notifications_status_check" CHECK("__new_notifications"."status" IS NULL OR "__new_notifications"."status" IN ('sent', 'failed', 'skipped'))
);
--> statement-breakpoint
INSERT INTO `__new_notifications`("id", "notice_key", "kind", "channel", "letter", "muscle_group_slugs", "due_at", "event_at", "created_at", "status", "error", "finished_at", "unsubscribe_token_hash") SELECT "id", "notice_key", "kind", "channel", "letter", "muscle_group_slugs", "due_at", "event_at", "created_at", "status", "error", "finished_at", "unsubscribe_token_hash" FROM `notifications`;--> statement-breakpoint
DROP TABLE `notifications`;--> statement-breakpoint
ALTER TABLE `__new_notifications` RENAME TO `notifications`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_unsubscribe_token_hash_unique` ON `notifications` (`unsubscribe_token_hash`);--> statement-breakpoint
CREATE INDEX `notifications_channel_created_at_idx` ON `notifications` (`channel`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_notice_key_channel_unique` ON `notifications` (`notice_key`,`channel`);