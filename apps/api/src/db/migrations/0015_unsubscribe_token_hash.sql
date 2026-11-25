ALTER TABLE `notifications` ADD `unsubscribe_token_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_unsubscribe_token_hash_unique` ON `notifications` (`unsubscribe_token_hash`);