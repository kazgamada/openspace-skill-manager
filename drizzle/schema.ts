import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const evolutionTypeEnum = pgEnum("evolution_type", ["create", "fix", "derive", "capture"]);
export const triggerTypeEnum = pgEnum("trigger_type", ["manual", "analysis", "degradation", "monitor"]);
export const executionStatusEnum = pgEnum("execution_status", ["success", "failure", "partial"]);
export const syncStatusEnum = pgEnum("sync_status", ["idle", "syncing", "success", "error"]);
export const githubSyncStatusEnum = pgEnum("github_sync_status", ["running", "success", "error"]);
export const suggestionStatusEnum = pgEnum("suggestion_status", ["pending", "installed", "dismissed"]);
export const evolutionProposalStatusEnum = pgEnum("evolution_proposal_status", ["pending", "applied", "dismissed"]);

// ─────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─────────────────────────────────────────────
// Skills (master)
// ─────────────────────────────────────────────
export const skills = pgTable("skills", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }),
  authorId: integer("authorId").references(() => users.id),
  isLocal: boolean("isLocal").default(true).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  tags: text("tags"),
  allowedTools: text("allowedTools"),
  sourceRepo: varchar("sourceRepo", { length: 512 }),
  sourceFile: varchar("sourceFile", { length: 512 }),
  mergedFrom: text("mergedFrom"),
  badge: varchar("badge", { length: 16 }),
  stars: integer("stars").default(0).notNull(),
  downloadCount: integer("downloadCount").default(0).notNull(),
  currentVersionId: varchar("currentVersionId", { length: 64 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

// ─────────────────────────────────────────────
// Skill Versions (DAG model)
// ─────────────────────────────────────────────
export const skillVersions = pgTable("skill_versions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  skillId: varchar("skillId", { length: 64 })
    .notNull()
    .references(() => skills.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 32 }).notNull(),
  parentId: varchar("parentId", { length: 64 }),
  evolutionType: evolutionTypeEnum("evolutionType").notNull(),
  triggerType: triggerTypeEnum("triggerType").default("manual"),
  qualityScore: real("qualityScore").default(0),
  successRate: real("successRate").default(0),
  codeContent: text("codeContent"),
  changeLog: text("changeLog"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type SkillVersion = typeof skillVersions.$inferSelect;
export type InsertSkillVersion = typeof skillVersions.$inferInsert;

// ─────────────────────────────────────────────
// Execution Logs
// ─────────────────────────────────────────────
export const executionLogs = pgTable("execution_logs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  skillVersionId: varchar("skillVersionId", { length: 64 })
    .notNull()
    .references(() => skillVersions.id, { onDelete: "cascade" }),
  skillId: varchar("skillId", { length: 64 })
    .notNull()
    .references(() => skills.id, { onDelete: "cascade" }),
  status: executionStatusEnum("status").notNull(),
  executionTime: real("executionTime"),
  errorMessage: text("errorMessage"),
  semanticCheck: boolean("semanticCheck").default(false),
  executedAt: timestamp("executedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type ExecutionLog = typeof executionLogs.$inferSelect;
export type InsertExecutionLog = typeof executionLogs.$inferInsert;

// ─────────────────────────────────────────────
// Skill Sources (external repositories)
// ─────────────────────────────────────────────
export const skillSources = pgTable("skill_sources", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  repoOwner: varchar("repoOwner", { length: 128 }).notNull(),
  repoName: varchar("repoName", { length: 128 }).notNull(),
  skillsPath: varchar("skillsPath", { length: 512 }).default("skills").notNull(),
  branch: varchar("branch", { length: 128 }).default("main").notNull(),
  autoSync: boolean("autoSync").default(true).notNull(),
  syncIntervalHours: integer("syncIntervalHours").default(6).notNull(),
  lastSyncedAt: timestamp("lastSyncedAt", { withTimezone: true }),
  lastSyncStatus: syncStatusEnum("lastSyncStatus").default("idle").notNull(),
  lastSyncError: text("lastSyncError"),
  totalSkills: integer("totalSkills").default(0).notNull(),
  newSkillsLastSync: integer("newSkillsLastSync").default(0).notNull(),
  updatedSkillsLastSync: integer("updatedSkillsLastSync").default(0).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type SkillSource = typeof skillSources.$inferSelect;
export type InsertSkillSource = typeof skillSources.$inferInsert;

// ─────────────────────────────────────────────
// Community Skills (cloud cache)
// ─────────────────────────────────────────────
export const communitySkills = pgTable("community_skills", {
  id: varchar("id", { length: 64 }).primaryKey(),
  remoteId: varchar("remoteId", { length: 128 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  author: varchar("author", { length: 128 }),
  category: varchar("category", { length: 64 }),
  tags: text("tags"),
  stars: integer("stars").default(0),
  downloads: integer("downloads").default(0),
  qualityScore: real("qualityScore").default(0),
  latestVersion: varchar("latestVersion", { length: 32 }),
  generationCount: integer("generationCount").default(1),
  codePreview: text("codePreview"),
  isInstalled: boolean("isInstalled").default(false),
  forkCount: integer("forkCount").default(0),
  repoOwner: varchar("repoOwner", { length: 128 }),
  repoName: varchar("repoName", { length: 128 }),
  crawlRank: real("crawlRank").default(0),
  crawlSource: varchar("crawlSource", { length: 32 }).default("manual"),
  githubUrl: varchar("githubUrl", { length: 512 }),
  sourceId: integer("sourceId").references(() => skillSources.id, { onDelete: "set null" }),
  upstreamSha: varchar("upstreamSha", { length: 64 }),
  lastSyncedAt: timestamp("lastSyncedAt", { withTimezone: true }),
  cachedAt: timestamp("cachedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type CommunitySkill = typeof communitySkills.$inferSelect;
export type InsertCommunitySkill = typeof communitySkills.$inferInsert;

// ─────────────────────────────────────────────
// Health Thresholds (system config)
// ─────────────────────────────────────────────
export const healthThresholds = pgTable("health_thresholds", {
  id: serial("id").primaryKey(),
  degradationThreshold: real("degradationThreshold").default(80).notNull(),
  criticalThreshold: real("criticalThreshold").default(50).notNull(),
  monitorInterval: integer("monitorInterval").default(60).notNull(),
  autoFixEnabled: boolean("autoFixEnabled").default(true).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type HealthThreshold = typeof healthThresholds.$inferSelect;

// ─────────────────────────────────────────────
// User Settings (per-user preferences + integrations)
// ─────────────────────────────────────────────
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  theme: varchar("theme", { length: 32 }).default("dark"),
  language: varchar("language", { length: 16 }).default("ja"),
  notifyOnRepair: boolean("notifyOnRepair").default(true),
  notifyOnDegradation: boolean("notifyOnDegradation").default(true),
  notifyOnCommunity: boolean("notifyOnCommunity").default(false),
  emailDigest: boolean("emailDigest").default(false),
  integrations: text("integrations"),
  autoSyncGithub: boolean("autoSyncGithub").default(false).notNull(),
  githubSyncFrequencyHours: integer("githubSyncFrequencyHours").default(24).notNull(),
  githubLastSyncAt: timestamp("githubLastSyncAt", { withTimezone: true }),
  publicWatchList: text("publicWatchList"),
  syncIntervalHours: integer("syncIntervalHours").default(24).notNull(),
  syncBranch: varchar("syncBranch", { length: 64 }).default("main").notNull(),
  evolutionSimilarityThreshold: integer("evolutionSimilarityThreshold").default(70).notNull(),
  evolutionCheckIntervalHours: integer("evolutionCheckIntervalHours").default(24).notNull(),
  crawlEnabled: boolean("crawlEnabled").default(true).notNull(),
  crawlIntervalHours: integer("crawlIntervalHours").default(24).notNull(),
  crawlKeywords: text("crawlKeywords"),
  crawlSearchPath: varchar("crawlSearchPath", { length: 255 }).default(".claude/skills").notNull(),
  crawlExcludeRepos: text("crawlExcludeRepos"),
  crawlMinStars: integer("crawlMinStars").default(0).notNull(),
  crawlMinForks: integer("crawlMinForks").default(0).notNull(),
  crawlMaxAgeDays: integer("crawlMaxAgeDays").default(0).notNull(),
  crawlMinSkillLength: integer("crawlMinSkillLength").default(100).notNull(),
  crawlDuplicatePolicy: varchar("crawlDuplicatePolicy", { length: 16 }).default("update").notNull(),
  crawlLanguageFilter: varchar("crawlLanguageFilter", { length: 128 }).default("").notNull(),
  crawlDailyLimit: integer("crawlDailyLimit").default(100).notNull(),
  crawlRankBy: varchar("crawlRankBy", { length: 32 }).default("composite").notNull(),
  crawlRateLimitMs: integer("crawlRateLimitMs").default(500).notNull(),
  crawlDuplicateWindowDays: integer("crawlDuplicateWindowDays").default(0).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

// ─────────────────────────────────────────────
// User Integrations (複数アカウント対応)
// ─────────────────────────────────────────────
export const userIntegrations = pgTable("user_integrations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  serviceType: varchar("serviceType", { length: 32 }).notNull(),
  label: varchar("label", { length: 128 }).notNull(),
  token: text("token"),
  config: text("config"),
  status: varchar("status", { length: 32 }).default("disconnected").notNull(),
  lastTestedAt: timestamp("lastTestedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});
export type UserIntegration = typeof userIntegrations.$inferSelect;
export type InsertUserIntegration = typeof userIntegrations.$inferInsert;

// ─────────────────────────────────────────────
// GitHub Auto Sync Logs (per-user sync history)
// ─────────────────────────────────────────────
export const githubSyncLogs = pgTable("github_sync_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: githubSyncStatusEnum("status").notNull().default("running"),
  reposScanned: integer("reposScanned").default(0).notNull(),
  skillsFound: integer("skillsFound").default(0).notNull(),
  created: integer("created").default(0).notNull(),
  updated: integer("updated").default(0).notNull(),
  skipped: integer("skipped").default(0).notNull(),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finishedAt", { withTimezone: true }),
});

export type GithubSyncLog = typeof githubSyncLogs.$inferSelect;
export type InsertGithubSyncLog = typeof githubSyncLogs.$inferInsert;

// ─────────────────────────────────────────────
// Claude Monitor Sessions (リアルタイムモニタリング)
// ─────────────────────────────────────────────
export const claudeMonitorSessions = pgTable("claude_monitor_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionLabel: varchar("sessionLabel", { length: 255 }),
  activityLog: text("activityLog"),
  detectedPatterns: text("detectedPatterns"),
  lastActivityAt: timestamp("lastActivityAt", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});
export type ClaudeMonitorSession = typeof claudeMonitorSessions.$inferSelect;
export type InsertClaudeMonitorSession = typeof claudeMonitorSessions.$inferInsert;

// ─────────────────────────────────────────────
// Skill Suggestions (スキル提案)
// ─────────────────────────────────────────────
export const skillSuggestions = pgTable("skill_suggestions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("sessionId", { length: 64 }),
  skillId: varchar("skillId", { length: 64 }),
  skillName: varchar("skillName", { length: 255 }).notNull(),
  skillDescription: text("skillDescription"),
  reason: text("reason").notNull(),
  source: varchar("source", { length: 32 }).default("community").notNull(),
  status: suggestionStatusEnum("status").default("pending").notNull(),
  confidence: integer("confidence").default(50).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});
export type SkillSuggestion = typeof skillSuggestions.$inferSelect;
export type InsertSkillSuggestion = typeof skillSuggestions.$inferInsert;

// ─────────────────────────────────────────────
// Skill Evolution Proposals (スキル進化提案)
// ─────────────────────────────────────────────
export const skillEvolutionProposals = pgTable("skill_evolution_proposals", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  mySkillId: varchar("mySkillId", { length: 64 }).references(() => skills.id, { onDelete: "cascade" }),
  mySkillName: varchar("mySkillName", { length: 255 }).notNull(),
  publicSkillIds: text("publicSkillIds").notNull(),
  publicSkillNames: text("publicSkillNames").notNull(),
  mergedContent: text("mergedContent").notNull(),
  reason: text("reason").notNull(),
  evolutionScore: integer("evolutionScore").default(0).notNull(),
  status: evolutionProposalStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});
export type SkillEvolutionProposal = typeof skillEvolutionProposals.$inferSelect;
export type InsertSkillEvolutionProposal = typeof skillEvolutionProposals.$inferInsert;
