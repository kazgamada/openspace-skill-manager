ALTER TABLE `community_skills` ADD `forkCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `community_skills` ADD `repoOwner` varchar(128);--> statement-breakpoint
ALTER TABLE `community_skills` ADD `repoName` varchar(128);--> statement-breakpoint
ALTER TABLE `community_skills` ADD `crawlRank` float DEFAULT 0;--> statement-breakpoint
ALTER TABLE `community_skills` ADD `crawlSource` varchar(32) DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `community_skills` ADD `githubUrl` varchar(512);