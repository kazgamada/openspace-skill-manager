CREATE TYPE "public"."evolution_proposal_status" AS ENUM('pending', 'applied', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."evolution_type" AS ENUM('create', 'fix', 'derive', 'capture');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('success', 'failure', 'partial');--> statement-breakpoint
CREATE TYPE "public"."github_sync_status" AS ENUM('running', 'success', 'error');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."suggestion_status" AS ENUM('pending', 'installed', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('idle', 'syncing', 'success', 'error');--> statement-breakpoint
CREATE TYPE "public"."trigger_type" AS ENUM('manual', 'analysis', 'degradation', 'monitor');--> statement-breakpoint
CREATE TABLE "claude_monitor_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"sessionLabel" varchar(255),
	"activityLog" text,
	"detectedPatterns" text,
	"lastActivityAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_skills" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"remoteId" varchar(128),
	"name" varchar(255) NOT NULL,
	"description" text,
	"author" varchar(128),
	"category" varchar(64),
	"tags" text,
	"stars" integer DEFAULT 0,
	"downloads" integer DEFAULT 0,
	"qualityScore" real DEFAULT 0,
	"latestVersion" varchar(32),
	"generationCount" integer DEFAULT 1,
	"codePreview" text,
	"isInstalled" boolean DEFAULT false,
	"forkCount" integer DEFAULT 0,
	"repoOwner" varchar(128),
	"repoName" varchar(128),
	"crawlRank" real DEFAULT 0,
	"crawlSource" varchar(32) DEFAULT 'manual',
	"githubUrl" varchar(512),
	"sourceId" integer,
	"upstreamSha" varchar(64),
	"lastSyncedAt" timestamp with time zone,
	"cachedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_logs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"skillVersionId" varchar(64) NOT NULL,
	"skillId" varchar(64) NOT NULL,
	"status" "execution_status" NOT NULL,
	"executionTime" real,
	"errorMessage" text,
	"semanticCheck" boolean DEFAULT false,
	"executedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"status" "github_sync_status" DEFAULT 'running' NOT NULL,
	"reposScanned" integer DEFAULT 0 NOT NULL,
	"skillsFound" integer DEFAULT 0 NOT NULL,
	"created" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	"errorMessage" text,
	"startedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"finishedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "health_thresholds" (
	"id" serial PRIMARY KEY NOT NULL,
	"degradationThreshold" real DEFAULT 80 NOT NULL,
	"criticalThreshold" real DEFAULT 50 NOT NULL,
	"monitorInterval" integer DEFAULT 60 NOT NULL,
	"autoFixEnabled" boolean DEFAULT true NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_evolution_proposals" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"mySkillId" varchar(64),
	"mySkillName" varchar(255) NOT NULL,
	"publicSkillIds" text NOT NULL,
	"publicSkillNames" text NOT NULL,
	"mergedContent" text NOT NULL,
	"reason" text NOT NULL,
	"evolutionScore" integer DEFAULT 0 NOT NULL,
	"status" "evolution_proposal_status" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"repoOwner" varchar(128) NOT NULL,
	"repoName" varchar(128) NOT NULL,
	"skillsPath" varchar(512) DEFAULT 'skills' NOT NULL,
	"branch" varchar(128) DEFAULT 'main' NOT NULL,
	"autoSync" boolean DEFAULT true NOT NULL,
	"syncIntervalHours" integer DEFAULT 6 NOT NULL,
	"lastSyncedAt" timestamp with time zone,
	"lastSyncStatus" "sync_status" DEFAULT 'idle' NOT NULL,
	"lastSyncError" text,
	"totalSkills" integer DEFAULT 0 NOT NULL,
	"newSkillsLastSync" integer DEFAULT 0 NOT NULL,
	"updatedSkillsLastSync" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_suggestions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"sessionId" varchar(64),
	"skillId" varchar(64),
	"skillName" varchar(255) NOT NULL,
	"skillDescription" text,
	"reason" text NOT NULL,
	"source" varchar(32) DEFAULT 'community' NOT NULL,
	"status" "suggestion_status" DEFAULT 'pending' NOT NULL,
	"confidence" integer DEFAULT 50 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_versions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"skillId" varchar(64) NOT NULL,
	"version" varchar(32) NOT NULL,
	"parentId" varchar(64),
	"evolutionType" "evolution_type" NOT NULL,
	"triggerType" "trigger_type" DEFAULT 'manual',
	"qualityScore" real DEFAULT 0,
	"successRate" real DEFAULT 0,
	"codeContent" text,
	"changeLog" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(64),
	"authorId" integer,
	"isLocal" boolean DEFAULT true NOT NULL,
	"isPublic" boolean DEFAULT false NOT NULL,
	"tags" text,
	"allowedTools" text,
	"sourceRepo" varchar(512),
	"sourceFile" varchar(512),
	"mergedFrom" text,
	"badge" varchar(16),
	"stars" integer DEFAULT 0 NOT NULL,
	"downloadCount" integer DEFAULT 0 NOT NULL,
	"currentVersionId" varchar(64),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"serviceType" varchar(32) NOT NULL,
	"label" varchar(128) NOT NULL,
	"token" text,
	"config" text,
	"status" varchar(32) DEFAULT 'disconnected' NOT NULL,
	"lastTestedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"theme" varchar(32) DEFAULT 'dark',
	"language" varchar(16) DEFAULT 'ja',
	"notifyOnRepair" boolean DEFAULT true,
	"notifyOnDegradation" boolean DEFAULT true,
	"notifyOnCommunity" boolean DEFAULT false,
	"emailDigest" boolean DEFAULT false,
	"integrations" text,
	"autoSyncGithub" boolean DEFAULT false NOT NULL,
	"githubSyncFrequencyHours" integer DEFAULT 24 NOT NULL,
	"githubLastSyncAt" timestamp with time zone,
	"publicWatchList" text,
	"syncIntervalHours" integer DEFAULT 24 NOT NULL,
	"syncBranch" varchar(64) DEFAULT 'main' NOT NULL,
	"evolutionSimilarityThreshold" integer DEFAULT 70 NOT NULL,
	"evolutionCheckIntervalHours" integer DEFAULT 24 NOT NULL,
	"crawlEnabled" boolean DEFAULT true NOT NULL,
	"crawlIntervalHours" integer DEFAULT 24 NOT NULL,
	"crawlKeywords" text,
	"crawlSearchPath" varchar(255) DEFAULT '.claude/skills' NOT NULL,
	"crawlExcludeRepos" text,
	"crawlMinStars" integer DEFAULT 0 NOT NULL,
	"crawlMinForks" integer DEFAULT 0 NOT NULL,
	"crawlMaxAgeDays" integer DEFAULT 0 NOT NULL,
	"crawlMinSkillLength" integer DEFAULT 100 NOT NULL,
	"crawlDuplicatePolicy" varchar(16) DEFAULT 'update' NOT NULL,
	"crawlLanguageFilter" varchar(128) DEFAULT '' NOT NULL,
	"crawlDailyLimit" integer DEFAULT 100 NOT NULL,
	"crawlRankBy" varchar(32) DEFAULT 'composite' NOT NULL,
	"crawlRateLimitMs" integer DEFAULT 500 NOT NULL,
	"crawlDuplicateWindowDays" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "claude_monitor_sessions" ADD CONSTRAINT "claude_monitor_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_skills" ADD CONSTRAINT "community_skills_sourceId_skill_sources_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."skill_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_skillVersionId_skill_versions_id_fk" FOREIGN KEY ("skillVersionId") REFERENCES "public"."skill_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_skillId_skills_id_fk" FOREIGN KEY ("skillId") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_sync_logs" ADD CONSTRAINT "github_sync_logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_evolution_proposals" ADD CONSTRAINT "skill_evolution_proposals_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_evolution_proposals" ADD CONSTRAINT "skill_evolution_proposals_mySkillId_skills_id_fk" FOREIGN KEY ("mySkillId") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_suggestions" ADD CONSTRAINT "skill_suggestions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_versions" ADD CONSTRAINT "skill_versions_skillId_skills_id_fk" FOREIGN KEY ("skillId") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_integrations" ADD CONSTRAINT "user_integrations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;