CREATE TABLE `workout_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`planned_exercise_id` text,
	`set_number` integer NOT NULL,
	`load_g` integer NOT NULL,
	`reps` integer,
	`seconds` integer,
	`performed_at` text NOT NULL,
	`corrected_at` text,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`planned_exercise_id`) REFERENCES `planned_exercises`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "workout_sets_set_number_check" CHECK("workout_sets"."set_number" >= 1),
	CONSTRAINT "workout_sets_load_g_check" CHECK("workout_sets"."load_g" >= 0),
	CONSTRAINT "workout_sets_reps_check" CHECK("workout_sets"."reps" IS NULL OR "workout_sets"."reps" >= 1),
	CONSTRAINT "workout_sets_seconds_check" CHECK("workout_sets"."seconds" IS NULL OR "workout_sets"."seconds" >= 1),
	CONSTRAINT "workout_sets_single_measure_check" CHECK(("workout_sets"."reps" IS NULL) <> ("workout_sets"."seconds" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `workout_sets_workout_idx` ON `workout_sets` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workout_sets_exercise_idx` ON `workout_sets` (`exercise_id`);--> statement-breakpoint
CREATE INDEX `workout_sets_planned_exercise_idx` ON `workout_sets` (`planned_exercise_id`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`program_day_id` text,
	`letter` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`end_reason` text,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`program_day_id`) REFERENCES `program_days`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "workouts_letter_check" CHECK("workouts"."letter" GLOB '[A-Z]'),
	CONSTRAINT "workouts_end_reason_check" CHECK("workouts"."end_reason" IS NULL OR "workouts"."end_reason" IN ('completed', 'ended_early'))
);
--> statement-breakpoint
CREATE INDEX `workouts_program_idx` ON `workouts` (`program_id`);--> statement-breakpoint
CREATE INDEX `workouts_program_day_idx` ON `workouts` (`program_day_id`);