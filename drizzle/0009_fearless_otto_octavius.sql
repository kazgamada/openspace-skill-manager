CREATE TABLE `claude_monitor_sessions` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`sessionLabel` varchar(255),
	`activityLog` text,
	`detectedPatterns` text,
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `claude_monitor_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skill_suggestions` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(64),
	`skillId` varchar(64),
	`skillName` varchar(255) NOT NULL,
	`skillDescription` text,
	`reason` text NOT NULL,
	`source` varchar(32) NOT NULL DEFAULT 'community',
	`status` enum('pending','installed','dismissed') NOT NULL DEFAULT 'pending',
	`confidence` int NOT NULL DEFAULT 50,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skill_suggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `claude_monitor_sessions` ADD CONSTRAINT `claude_monitor_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skill_suggestions` ADD CONSTRAINT `skill_suggestions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;