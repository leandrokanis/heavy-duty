CREATE TABLE `periods` (
	`id` text PRIMARY KEY NOT NULL,
	`number` integer NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`intention` text,
	`frozen_at` text,
	CONSTRAINT "periods_number_check" CHECK("periods"."number" >= 1),
	CONSTRAINT "periods_intention_check" CHECK("periods"."intention" IS NULL OR length("periods"."intention") BETWEEN 1 AND 120)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `periods_number_unique` ON `periods` (`number`);