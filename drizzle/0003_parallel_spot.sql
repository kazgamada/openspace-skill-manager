CREATE TABLE `user_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`theme` varchar(32) DEFAULT 'dark',
	`language` varchar(16) DEFAULT 'ja',
	`notifyOnRepair` boolean DEFAULT true,
	`notifyOnDegradation` boolean DEFAULT true,
	`notifyOnCommunity` boolean DEFAULT false,
	`emailDigest` boolean DEFAULT false,
	`integrations` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `user_settings` ADD CONSTRAINT `user_settings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;