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
