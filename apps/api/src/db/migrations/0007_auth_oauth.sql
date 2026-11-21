CREATE TABLE `oauth_authorization_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code_hash` text NOT NULL,
	`client_id` text NOT NULL,
	`redirect_uri` text NOT NULL,
	`code_challenge` text NOT NULL,
	`resource` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_authorization_codes_code_hash_unique` ON `oauth_authorization_codes` (`code_hash`);--> statement-breakpoint
CREATE INDEX `oauth_authorization_codes_client_idx` ON `oauth_authorization_codes` (`client_id`);--> statement-breakpoint
CREATE TABLE `oauth_clients` (
	`id` text PRIMARY KEY NOT NULL,
	`client_name` text,
	`redirect_uris` text NOT NULL,
	`created_at` text NOT NULL,
	`approved_at` text
);
--> statement-breakpoint
CREATE TABLE `oauth_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`resource` text NOT NULL,
	`access_token_hash` text NOT NULL,
	`access_expires_at` text NOT NULL,
	`refresh_token_hash` text NOT NULL,
	`previous_refresh_token_hash` text,
	`refresh_expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_grants_access_token_hash_unique` ON `oauth_grants` (`access_token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_grants_refresh_token_hash_unique` ON `oauth_grants` (`refresh_token_hash`);--> statement-breakpoint
CREATE INDEX `oauth_grants_client_idx` ON `oauth_grants` (`client_id`);--> statement-breakpoint
CREATE INDEX `oauth_grants_previous_refresh_idx` ON `oauth_grants` (`previous_refresh_token_hash`);