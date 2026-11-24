ALTER TABLE `workout_sets` ADD `planned_group_sets` text;--> statement-breakpoint
-- Addendum to ADR-033: the sets recorded before take the planned sets of the current letter of their workout.
UPDATE `workout_sets` SET `planned_group_sets` = (
	SELECT json_group_object(g."slug", (
		SELECT coalesce(sum(pe."sets"), 0) FROM `planned_exercises` pe
		WHERE pe."program_day_id" = w."program_day_id" AND EXISTS (
			SELECT 1 FROM `exercise_muscles` em2
			INNER JOIN `muscles` m2 ON m2."id" = em2."muscle_id"
			WHERE em2."exercise_id" = pe."exercise_id" AND em2."role" = 'primary' AND m2."muscle_group_id" = g."id"
		)
	))
	FROM `workouts` w, (
		SELECT DISTINCT mg."id", mg."slug" FROM `exercise_muscles` em
		INNER JOIN `muscles` m ON m."id" = em."muscle_id"
		INNER JOIN `muscle_groups` mg ON mg."id" = m."muscle_group_id"
		WHERE em."exercise_id" = `workout_sets`."exercise_id" AND em."role" = 'primary'
	) g
	WHERE w."id" = `workout_sets`."workout_id"
)
WHERE `workout_sets`."workout_id" IN (SELECT "id" FROM `workouts` WHERE "program_day_id" IS NOT NULL);
