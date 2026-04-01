ALTER TABLE `user_settings` ADD `syncIntervalHours` int DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `syncBranch` varchar(64) DEFAULT 'main' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `evolutionSimilarityThreshold` int DEFAULT 70 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `evolutionCheckIntervalHours` int DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `crawlEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `crawlIntervalHours` int DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `crawlKeywords` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `crawlSearchPath` varchar(255) DEFAULT '.claude/skills' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `crawlExcludeRepos` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `crawlMinStars` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `crawlMinForks` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `crawlMaxAgeDays` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `crawlMinSkillLength` int DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `crawlDuplicatePolicy` varchar(16) DEFAULT 'update' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `crawlLanguageFilter` varchar(128) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `crawlDailyLimit` int DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `crawlRankBy` varchar(32) DEFAULT 'composite' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `crawlRateLimitMs` int DEFAULT 500 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `crawlDuplicateWindowDays` int DEFAULT 0 NOT NULL;