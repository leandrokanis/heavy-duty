CREATE TABLE `backup_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text NOT NULL,
	`status` text NOT NULL,
	`size_bytes` integer,
	`error` text,
	CONSTRAINT "backup_runs_status_check" CHECK("backup_runs"."status" IN ('succeeded', 'failed')),
	CONSTRAINT "backup_runs_size_bytes_check" CHECK("backup_runs"."size_bytes" IS NULL OR "backup_runs"."size_bytes" >= 0)
);
