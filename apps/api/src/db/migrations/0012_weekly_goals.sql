CREATE TABLE `weekly_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`windows` integer NOT NULL,
	`defined_at` text NOT NULL,
	CONSTRAINT "weekly_goals_windows_check" CHECK("weekly_goals"."windows" BETWEEN 1 AND 77)
);
--> statement-breakpoint
CREATE INDEX `weekly_goals_defined_at_idx` ON `weekly_goals` (`defined_at`);