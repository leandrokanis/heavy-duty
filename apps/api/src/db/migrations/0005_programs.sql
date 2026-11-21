CREATE TABLE `planned_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`program_day_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`sets` integer NOT NULL,
	`target_reps` integer,
	`target_seconds` integer,
	`load_g` integer NOT NULL,
	`rest_seconds` integer NOT NULL,
	FOREIGN KEY (`program_day_id`) REFERENCES `program_days`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "planned_exercises_sets_check" CHECK("planned_exercises"."sets" >= 1),
	CONSTRAINT "planned_exercises_target_reps_check" CHECK("planned_exercises"."target_reps" IS NULL OR "planned_exercises"."target_reps" >= 1),
	CONSTRAINT "planned_exercises_target_seconds_check" CHECK("planned_exercises"."target_seconds" IS NULL OR "planned_exercises"."target_seconds" >= 1),
	CONSTRAINT "planned_exercises_single_target_check" CHECK(("planned_exercises"."target_reps" IS NULL) <> ("planned_exercises"."target_seconds" IS NULL)),
	CONSTRAINT "planned_exercises_load_g_check" CHECK("planned_exercises"."load_g" >= 0),
	CONSTRAINT "planned_exercises_rest_seconds_check" CHECK("planned_exercises"."rest_seconds" >= 0)
);
--> statement-breakpoint
CREATE INDEX `planned_exercises_exercise_idx` ON `planned_exercises` (`exercise_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `planned_exercises_day_position_unique` ON `planned_exercises` (`program_day_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `planned_exercises_day_exercise_unique` ON `planned_exercises` (`program_day_id`,`exercise_id`);--> statement-breakpoint
CREATE TABLE `program_days` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`letter` text NOT NULL,
	`label` text,
	`position` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "program_days_letter_check" CHECK("program_days"."letter" GLOB '[A-Z]')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `program_days_program_letter_unique` ON `program_days` (`program_id`,`letter`);--> statement-breakpoint
CREATE UNIQUE INDEX `program_days_program_position_unique` ON `program_days` (`program_id`,`position`);--> statement-breakpoint
CREATE TABLE `programs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`goal` text NOT NULL,
	`is_active` integer NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "programs_goal_check" CHECK("programs"."goal" IN ('strength', 'hypertrophy', 'endurance'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `programs_single_active_idx` ON `programs` (`is_active`) WHERE "programs"."is_active" = 1;