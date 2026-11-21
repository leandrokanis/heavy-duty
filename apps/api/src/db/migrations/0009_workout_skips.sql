CREATE TABLE `workout_skips` (
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`planned_exercise_id` text,
	`skipped_at` text NOT NULL,
	PRIMARY KEY(`workout_id`, `exercise_id`),
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`planned_exercise_id`) REFERENCES `planned_exercises`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workout_skips_exercise_idx` ON `workout_skips` (`exercise_id`);--> statement-breakpoint
CREATE INDEX `workout_skips_planned_exercise_idx` ON `workout_skips` (`planned_exercise_id`);