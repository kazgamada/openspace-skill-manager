CREATE TABLE `skill_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`repoOwner` varchar(128) NOT NULL,
	`repoName` varchar(128) NOT NULL,
	`skillsPath` varchar(512) NOT NULL DEFAULT 'skills',
	`branch` varchar(128) NOT NULL DEFAULT 'main',
	`autoSync` boolean NOT NULL DEFAULT true,
	`syncIntervalHours` int NOT NULL DEFAULT 6,
	`lastSyncedAt` timestamp,
	`lastSyncStatus` enum('idle','syncing','success','error') NOT NULL DEFAULT 'idle',
	`lastSyncError` text,
	`totalSkills` int NOT NULL DEFAULT 0,
	`newSkillsLastSync` int NOT NULL DEFAULT 0,
	`updatedSkillsLastSync` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skill_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `community_skills` ADD `sourceId` int;--> statement-breakpoint
ALTER TABLE `community_skills` ADD `upstreamSha` varchar(64);--> statement-breakpoint
ALTER TABLE `community_skills` ADD `lastSyncedAt` timestamp;--> statement-breakpoint
ALTER TABLE `community_skills` ADD CONSTRAINT `community_skills_sourceId_skill_sources_id_fk` FOREIGN KEY (`sourceId`) REFERENCES `skill_sources`(`id`) ON DELETE set null ON UPDATE no action;