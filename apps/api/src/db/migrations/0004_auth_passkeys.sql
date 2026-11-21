CREATE TABLE `auth_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`credential_id` text NOT NULL,
	`public_key` blob NOT NULL,
	`counter` integer NOT NULL,
	`transports` text,
	`created_at` text NOT NULL,
	`last_used_at` text,
	CONSTRAINT "auth_credentials_counter_check" CHECK("auth_credentials"."counter" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_credentials_credential_id_unique` ON `auth_credentials` (`credential_id`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_hash_unique` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `enrollment_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_tokens_token_hash_unique` ON `enrollment_tokens` (`token_hash`);