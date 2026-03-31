ALTER TABLE `user_settings` ADD `githubSyncFrequencyHours` int DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `githubLastSyncAt` timestamp;