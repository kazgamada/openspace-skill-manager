CREATE TABLE `community_skills` (
	`id` varchar(64) NOT NULL,
	`remoteId` varchar(128),
	`name` varchar(255) NOT NULL,
	`description` text,
	`author` varchar(128),
	`category` varchar(64),
	`tags` text,
	`stars` int DEFAULT 0,
	`downloads` int DEFAULT 0,
	`qualityScore` float DEFAULT 0,
	`latestVersion` varchar(32),
	`generationCount` int DEFAULT 1,
	`codePreview` text,
	`isInstalled` boolean DEFAULT false,
	`cachedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `community_skills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `execution_logs` (
	`id` varchar(64) NOT NULL,
	`skillVersionId` varchar(64) NOT NULL,
	`skillId` varchar(64) NOT NULL,
	`status` enum('success','failure','partial') NOT NULL,
	`executionTime` float,
	`errorMessage` text,
	`semanticCheck` boolean DEFAULT false,
	`executedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `execution_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `health_thresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`degradationThreshold` float NOT NULL DEFAULT 80,
	`criticalThreshold` float NOT NULL DEFAULT 50,
	`monitorInterval` int NOT NULL DEFAULT 60,
	`autoFixEnabled` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `health_thresholds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skill_versions` (
	`id` varchar(64) NOT NULL,
	`skillId` varchar(64) NOT NULL,
	`version` varchar(32) NOT NULL,
	`parentId` varchar(64),
	`evolutionType` enum('create','fix','derive','capture') NOT NULL,
	`triggerType` enum('manual','analysis','degradation','monitor') DEFAULT 'manual',
	`qualityScore` float DEFAULT 0,
	`successRate` float DEFAULT 0,
	`codeContent` text,
	`changeLog` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skill_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(64),
	`authorId` int,
	`isLocal` boolean NOT NULL DEFAULT true,
	`isPublic` boolean NOT NULL DEFAULT false,
	`tags` text,
	`stars` int NOT NULL DEFAULT 0,
	`downloadCount` int NOT NULL DEFAULT 0,
	`currentVersionId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `execution_logs` ADD CONSTRAINT `execution_logs_skillVersionId_skill_versions_id_fk` FOREIGN KEY (`skillVersionId`) REFERENCES `skill_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `execution_logs` ADD CONSTRAINT `execution_logs_skillId_skills_id_fk` FOREIGN KEY (`skillId`) REFERENCES `skills`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skill_versions` ADD CONSTRAINT `skill_versions_skillId_skills_id_fk` FOREIGN KEY (`skillId`) REFERENCES `skills`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skills` ADD CONSTRAINT `skills_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;