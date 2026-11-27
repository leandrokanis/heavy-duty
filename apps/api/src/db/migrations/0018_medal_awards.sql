CREATE TABLE `medal_awards` (
	`id` text PRIMARY KEY NOT NULL,
	`medal_code` text NOT NULL,
	`subject` text,
	`workout_id` text,
	`awarded_at` text NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `medal_awards_medal_code_unique` ON `medal_awards` (`medal_code`);--> statement-breakpoint
CREATE INDEX `medal_awards_awarded_at_idx` ON `medal_awards` (`awarded_at`);