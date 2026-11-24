PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_workout_sets` (
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
	`planned_load_g` integer,
	`target_reps` integer,
	`target_seconds` integer,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`planned_exercise_id`) REFERENCES `planned_exercises`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "workout_sets_set_number_check" CHECK("__new_workout_sets"."set_number" >= 1),
	CONSTRAINT "workout_sets_load_g_check" CHECK("__new_workout_sets"."load_g" >= 0),
	CONSTRAINT "workout_sets_reps_check" CHECK("__new_workout_sets"."reps" IS NULL OR "__new_workout_sets"."reps" >= 1),
	CONSTRAINT "workout_sets_seconds_check" CHECK("__new_workout_sets"."seconds" IS NULL OR "__new_workout_sets"."seconds" >= 1),
	CONSTRAINT "workout_sets_single_measure_check" CHECK(("__new_workout_sets"."reps" IS NULL) <> ("__new_workout_sets"."seconds" IS NULL)),
	CONSTRAINT "workout_sets_planned_load_g_check" CHECK("__new_workout_sets"."planned_load_g" IS NULL OR "__new_workout_sets"."planned_load_g" >= 0),
	CONSTRAINT "workout_sets_target_reps_check" CHECK("__new_workout_sets"."target_reps" IS NULL OR "__new_workout_sets"."target_reps" >= 1),
	CONSTRAINT "workout_sets_target_seconds_check" CHECK("__new_workout_sets"."target_seconds" IS NULL OR "__new_workout_sets"."target_seconds" >= 1),
	CONSTRAINT "workout_sets_plan_check" CHECK(("__new_workout_sets"."planned_load_g" IS NULL AND "__new_workout_sets"."target_reps" IS NULL AND "__new_workout_sets"."target_seconds" IS NULL) OR ("__new_workout_sets"."planned_load_g" IS NOT NULL AND ("__new_workout_sets"."target_reps" IS NULL) <> ("__new_workout_sets"."target_seconds" IS NULL)))
);
--> statement-breakpoint
-- ADR-033: the sets recorded before the frozen plan take the current plan of their exercise.
INSERT INTO `__new_workout_sets`("id", "workout_id", "exercise_id", "planned_exercise_id", "set_number", "load_g", "reps", "seconds", "performed_at", "corrected_at", "planned_load_g", "target_reps", "target_seconds") SELECT ws."id", ws."workout_id", ws."exercise_id", ws."planned_exercise_id", ws."set_number", ws."load_g", ws."reps", ws."seconds", ws."performed_at", ws."corrected_at", pe."load_g", pe."target_reps", pe."target_seconds" FROM `workout_sets` ws LEFT JOIN `planned_exercises` pe ON pe."id" = ws."planned_exercise_id";--> statement-breakpoint
DROP TABLE `workout_sets`;--> statement-breakpoint
ALTER TABLE `__new_workout_sets` RENAME TO `workout_sets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `workout_sets_workout_idx` ON `workout_sets` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workout_sets_exercise_idx` ON `workout_sets` (`exercise_id`);--> statement-breakpoint
CREATE INDEX `workout_sets_planned_exercise_idx` ON `workout_sets` (`planned_exercise_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `workout_sets_workout_exercise_set_unique` ON `workout_sets` (`workout_id`,`exercise_id`,`set_number`);