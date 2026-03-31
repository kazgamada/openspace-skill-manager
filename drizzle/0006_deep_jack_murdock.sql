CREATE TABLE `github_sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('running','success','error') NOT NULL DEFAULT 'running',
	`reposScanned` int NOT NULL DEFAULT 0,
	`skillsFound` int NOT NULL DEFAULT 0,
	`created` int NOT NULL DEFAULT 0,
	`updated` int NOT NULL DEFAULT 0,
	`skipped` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	CONSTRAINT `github_sync_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_settings` ADD `autoSyncGithub` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `github_sync_logs` ADD CONSTRAINT `github_sync_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;