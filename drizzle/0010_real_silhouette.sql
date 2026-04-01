CREATE TABLE `skill_evolution_proposals` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`mySkillId` varchar(64),
	`mySkillName` varchar(255) NOT NULL,
	`publicSkillIds` text NOT NULL,
	`publicSkillNames` text NOT NULL,
	`mergedContent` text NOT NULL,
	`reason` text NOT NULL,
	`evolutionScore` int NOT NULL DEFAULT 0,
	`status` enum('pending','applied','dismissed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skill_evolution_proposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `skill_evolution_proposals` ADD CONSTRAINT `skill_evolution_proposals_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skill_evolution_proposals` ADD CONSTRAINT `skill_evolution_proposals_mySkillId_skills_id_fk` FOREIGN KEY (`mySkillId`) REFERENCES `skills`(`id`) ON DELETE cascade ON UPDATE no action;