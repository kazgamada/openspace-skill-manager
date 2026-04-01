import {
  boolean,
  float,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─────────────────────────────────────────────
// Skills (master)
// ─────────────────────────────────────────────
export const skills = mysqlTable("skills", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }),
  authorId: int("authorId").references(() => users.id),
  isLocal: boolean("isLocal").default(true).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  tags: text("tags"), // JSON array stored as text e.g. ["Read","Bash"]
  allowedTools: text("allowedTools"), // JSON array from SKILL.md allowed-tools frontmatter
  sourceRepo: varchar("sourceRepo", { length: 512 }), // GitHub repo URL if imported from GitHub
  sourceFile: varchar("sourceFile", { length: 512 }), // original file path in repo
  mergedFrom: text("mergedFrom"), // JSON array of source skill IDs used in AI merge
  badge: varchar("badge", { length: 16 }), // null | 'new' | 'repaired' | 'derived'
  stars: int("stars").default(0).notNull(),
  downloadCount: int("downloadCount").default(0).notNull(),
  currentVersionId: varchar("currentVersionId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

// ─────────────────────────────────────────────
// Skill Versions (DAG model)
// ─────────────────────────────────────────────
export const skillVersions = mysqlTable("skill_versions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  skillId: varchar("skillId", { length: 64 })
    .notNull()
    .references(() => skills.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 32 }).notNull(), // e.g. "v3.2.1"
  parentId: varchar("parentId", { length: 64 }), // self-reference via app logic
  evolutionType: mysqlEnum("evolutionType", ["create", "fix", "derive", "capture"]).notNull(),
  triggerType: mysqlEnum("triggerType", ["manual", "analysis", "degradation", "monitor"]).default(
    "manual"
  ),
  qualityScore: float("qualityScore").default(0),
  successRate: float("successRate").default(0),
  codeContent: text("codeContent"),
  changeLog: text("changeLog"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SkillVersion = typeof skillVersions.$inferSelect;
export type InsertSkillVersion = typeof skillVersions.$inferInsert;

// ─────────────────────────────────────────────
// Execution Logs
// ─────────────────────────────────────────────
export const executionLogs = mysqlTable("execution_logs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  skillVersionId: varchar("skillVersionId", { length: 64 })
    .notNull()
    .references(() => skillVersions.id, { onDelete: "cascade" }),
  skillId: varchar("skillId", { length: 64 })
    .notNull()
    .references(() => skills.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["success", "failure", "partial"]).notNull(),
  executionTime: float("executionTime"), // seconds
  errorMessage: text("errorMessage"),
  semanticCheck: boolean("semanticCheck").default(false),
  executedAt: timestamp("executedAt").defaultNow().notNull(),
});

export type ExecutionLog = typeof executionLogs.$inferSelect;
export type InsertExecutionLog = typeof executionLogs.$inferInsert;

// ─────────────────────────────────────────────
// Skill Sources (external repositories)
// ─────────────────────────────────────────────
export const skillSources = mysqlTable("skill_sources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),          // 表示名 e.g. "everything-claude-code"
  repoOwner: varchar("repoOwner", { length: 128 }).notNull(), // e.g. "affaan-m"
  repoName: varchar("repoName", { length: 128 }).notNull(),   // e.g. "everything-claude-code"
  skillsPath: varchar("skillsPath", { length: 512 }).default("skills").notNull(), // path in repo
  branch: varchar("branch", { length: 128 }).default("main").notNull(),
  autoSync: boolean("autoSync").default(true).notNull(),     // 自動同期有効
  syncIntervalHours: int("syncIntervalHours").default(6).notNull(),
  lastSyncedAt: timestamp("lastSyncedAt"),
  lastSyncStatus: mysqlEnum("lastSyncStatus", ["idle", "syncing", "success", "error"]).default("idle").notNull(),
  lastSyncError: text("lastSyncError"),
  totalSkills: int("totalSkills").default(0).notNull(),
  newSkillsLastSync: int("newSkillsLastSync").default(0).notNull(),
  updatedSkillsLastSync: int("updatedSkillsLastSync").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SkillSource = typeof skillSources.$inferSelect;
export type InsertSkillSource = typeof skillSources.$inferInsert;

// ─────────────────────────────────────────────
// Community Skills (cloud cache)
// ─────────────────────────────────────────────
export const communitySkills = mysqlTable("community_skills", {
  id: varchar("id", { length: 64 }).primaryKey(),
  remoteId: varchar("remoteId", { length: 128 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  author: varchar("author", { length: 128 }),
  category: varchar("category", { length: 64 }),
  tags: text("tags"), // JSON array stored as text
  stars: int("stars").default(0),
  downloads: int("downloads").default(0),
  qualityScore: float("qualityScore").default(0),
  latestVersion: varchar("latestVersion", { length: 32 }),
  generationCount: int("generationCount").default(1),
  codePreview: text("codePreview"),
  isInstalled: boolean("isInstalled").default(false),
  // GitHub crawl fields
  forkCount: int("forkCount").default(0),
  repoOwner: varchar("repoOwner", { length: 128 }),
  repoName: varchar("repoName", { length: 128 }),
  crawlRank: float("crawlRank").default(0),
  crawlSource: varchar("crawlSource", { length: 32 }).default("manual"),
  githubUrl: varchar("githubUrl", { length: 512 }),
  // Dynamic sync fields
  sourceId: int("sourceId").references(() => skillSources.id, { onDelete: "set null" }),
  upstreamSha: varchar("upstreamSha", { length: 64 }), // GitHub blob SHA for change detection
  lastSyncedAt: timestamp("lastSyncedAt"),
  cachedAt: timestamp("cachedAt").defaultNow().notNull(),
});

export type CommunitySkill = typeof communitySkills.$inferSelect;
export type InsertCommunitySkill = typeof communitySkills.$inferInsert;

// ─────────────────────────────────────────────
// Health Thresholds (system config)
// ─────────────────────────────────────────────
export const healthThresholds = mysqlTable("health_thresholds", {
  id: int("id").autoincrement().primaryKey(),
  degradationThreshold: float("degradationThreshold").default(80).notNull(),
  criticalThreshold: float("criticalThreshold").default(50).notNull(),
  monitorInterval: int("monitorInterval").default(60).notNull(), // minutes
  autoFixEnabled: boolean("autoFixEnabled").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HealthThreshold = typeof healthThresholds.$inferSelect;

// ─────────────────────────────────────────────
// User Settings (per-user preferences + integrations)
// ─────────────────────────────────────────────
export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  // Appearance
  theme: varchar("theme", { length: 32 }).default("dark"),
  language: varchar("language", { length: 16 }).default("ja"),
  // Notifications
  notifyOnRepair: boolean("notifyOnRepair").default(true),
  notifyOnDegradation: boolean("notifyOnDegradation").default(true),
  notifyOnCommunity: boolean("notifyOnCommunity").default(false),
  emailDigest: boolean("emailDigest").default(false),
  // Integrations (JSON object with per-service config)
  // Shape: { claude?: { apiKey?, mcpPath?, connected, lastTestedAt }, github?: { token?, username?, connected, lastTestedAt }, googleDrive?: { folderId?, connected, lastTestedAt }, localFolder?: { path?, connected, lastTestedAt } }
  integrations: text("integrations"),
  // GitHub auto sync settings
  autoSyncGithub: boolean("autoSyncGithub").default(false).notNull(),
  // Sync frequency in hours: 1=毎時, 6=6時間毎, 24=毎日(default), 168=毎週
  githubSyncFrequencyHours: int("githubSyncFrequencyHours").default(24).notNull(),
  // Last time GitHub auto sync ran for this user
  githubLastSyncAt: timestamp("githubLastSyncAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

// ─────────────────────────────────────────────
// User Integrations (複数アカウント対応)
// ─────────────────────────────────────────────
export const userIntegrations = mysqlTable("user_integrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  // サービス種別: claude | github | google_drive | local_folder
  serviceType: varchar("serviceType", { length: 32 }).notNull(),
  // ユーザーが付けたラベル（例: "仕事用GitHub", "個人用"）
  label: varchar("label", { length: 128 }).notNull(),
  // 認証情報（APIキー・トークン等）
  token: text("token"),
  // サービス固有の設定（JSON）
  // GitHub: { username, repoFilter }
  // Google Drive: { folderId, folderName }
  // Local Folder: { path }
  // Claude: { mcpPath, model }
  config: text("config"),
  // 接続状態
  status: varchar("status", { length: 32 }).default("disconnected").notNull(), // connected | disconnected | error
  lastTestedAt: timestamp("lastTestedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserIntegration = typeof userIntegrations.$inferSelect;
export type InsertUserIntegration = typeof userIntegrations.$inferInsert;

// ─────────────────────────────────────────────
// GitHub Auto Sync Logs (per-user sync history)
// ─────────────────────────────────────────────
export const githubSyncLogs = mysqlTable("github_sync_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["running", "success", "error"]).notNull().default("running"),
  reposScanned: int("reposScanned").default(0).notNull(),
  skillsFound: int("skillsFound").default(0).notNull(),
  created: int("created").default(0).notNull(),
  updated: int("updated").default(0).notNull(),
  skipped: int("skipped").default(0).notNull(),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  finishedAt: timestamp("finishedAt"),
});

export type GithubSyncLog = typeof githubSyncLogs.$inferSelect;
export type InsertGithubSyncLog = typeof githubSyncLogs.$inferInsert;

// ─────────────────────────────────────────────
// Claude Monitor Sessions (リアルタイムモニタリング)
// ─────────────────────────────────────────────
export const claudeMonitorSessions = mysqlTable("claude_monitor_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  // セッション識別子（Claude Codeのプロジェクト名や作業ディレクトリ）
  sessionLabel: varchar("sessionLabel", { length: 255 }),
  // 作業ログ（JSON配列: [{tool, input, timestamp}]）
  activityLog: text("activityLog"),
  // 検出されたパターン（JSON: {tools:[], errors:[], tasks:[]}）
  detectedPatterns: text("detectedPatterns"),
  // 最後のアクティビティ
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ClaudeMonitorSession = typeof claudeMonitorSessions.$inferSelect;
export type InsertClaudeMonitorSession = typeof claudeMonitorSessions.$inferInsert;

// ─────────────────────────────────────────────
// Skill Suggestions (スキル提案)
// ─────────────────────────────────────────────
export const skillSuggestions = mysqlTable("skill_suggestions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("sessionId", { length: 64 }),
  // 提案スキル（マイスキルIDまたはコミュニティスキルID）
  skillId: varchar("skillId", { length: 64 }),
  skillName: varchar("skillName", { length: 255 }).notNull(),
  skillDescription: text("skillDescription"),
  // 提案理由（例: "Bashツールを頻繁に使用しています"）
  reason: text("reason").notNull(),
  // 提案元（my_skills | community | github_crawl）
  source: varchar("source", { length: 32 }).default("community").notNull(),
  // ステータス（pending | installed | dismissed）
  status: mysqlEnum("status", ["pending", "installed", "dismissed"]).default("pending").notNull(),
  // 信頼スコア（0-100）
  confidence: int("confidence").default(50).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SkillSuggestion = typeof skillSuggestions.$inferSelect;
export type InsertSkillSuggestion = typeof skillSuggestions.$inferInsert;

// ─────────────────────────────────────────────
// Skill Evolution Proposals (スキル進化提案)
// ─────────────────────────────────────────────
export const skillEvolutionProposals = mysqlTable("skill_evolution_proposals", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  // 進化対象のマイスキル
  mySkillId: varchar("mySkillId", { length: 64 }).references(() => skills.id, { onDelete: "cascade" }),
  mySkillName: varchar("mySkillName", { length: 255 }).notNull(),
  // 合成に使用する公開スキルのID配列（JSON）
  publicSkillIds: text("publicSkillIds").notNull(), // JSON: ["id1","id2"]
  // 合成に使用する公開スキルの名前配列（JSON）
  publicSkillNames: text("publicSkillNames").notNull(), // JSON: ["name1","name2"]
  // 合成後のスキルコンテンツ（SKILL.md形式）
  mergedContent: text("mergedContent").notNull(),
  // 進化の理由（何が強化されるか）
  reason: text("reason").notNull(),
  // 進化スコア（0-100）
  evolutionScore: int("evolutionScore").default(0).notNull(),
  // ステータス（pending | applied | dismissed）
  status: mysqlEnum("status", ["pending", "applied", "dismissed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SkillEvolutionProposal = typeof skillEvolutionProposals.$inferSelect;
export type InsertSkillEvolutionProposal = typeof skillEvolutionProposals.$inferInsert;
