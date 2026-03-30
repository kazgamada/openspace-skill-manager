ALTER TABLE `skills` ADD `allowedTools` text;--> statement-breakpoint
ALTER TABLE `skills` ADD `sourceRepo` varchar(512);--> statement-breakpoint
ALTER TABLE `skills` ADD `sourceFile` varchar(512);--> statement-breakpoint
ALTER TABLE `skills` ADD `mergedFrom` text;