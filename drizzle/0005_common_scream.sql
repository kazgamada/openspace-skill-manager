CREATE TABLE `user_integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`serviceType` varchar(32) NOT NULL,
	`label` varchar(128) NOT NULL,
	`token` text,
	`config` text,
	`status` varchar(32) NOT NULL DEFAULT 'disconnected',
	`lastTestedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_integrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_integrations` ADD CONSTRAINT `user_integrations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;