CREATE TABLE `period_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`muscle_group_id` text NOT NULL,
	`level` integer NOT NULL,
	`points` integer NOT NULL,
	`best_level` integer NOT NULL,
	`window_state` text NOT NULL,
	`windows_used` integer NOT NULL,
	`windows_missed` integer NOT NULL,
	FOREIGN KEY (`period_id`) REFERENCES `periods`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`muscle_group_id`) REFERENCES `muscle_groups`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "period_snapshots_window_state_check" CHECK("period_snapshots"."window_state" IN ('resting', 'open', 'cooling', 'none'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `period_snapshots_period_group_unique` ON `period_snapshots` (`period_id`,`muscle_group_id`);--> statement-breakpoint
ALTER TABLE `periods` ADD `windows_used` integer;--> statement-breakpoint
ALTER TABLE `periods` ADD `windows_missed` integer;--> statement-breakpoint
ALTER TABLE `periods` ADD `points` integer;--> statement-breakpoint
ALTER TABLE `periods` ADD `best_workout_points` integer;--> statement-breakpoint
ALTER TABLE `periods` ADD `week_streak` integer;