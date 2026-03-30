import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  CommunitySkill,
  ExecutionLog,
  InsertCommunitySkill,
  InsertExecutionLog,
  InsertSkill,
  InsertSkillVersion,
  InsertUser,
  Skill,
  SkillVersion,
  communitySkills,
  executionLogs,
  healthThresholds,
  skillVersions,
  skills,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

// ─────────────────────────────────────────────
// DB Connection
// ─────────────────────────────────────────────
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.error("[Database] Connection failed:", error);
      _db = null;
    }
  }
  return _db;
}

// ─────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) { console.warn("[DB] upsertUser: no db"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  (["name", "email", "loginMethod"] as const).forEach((f) => {
    if (user[f] !== undefined) { values[f] = user[f] ?? null; updateSet[f] = user[f] ?? null; }
  });

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();

  // Auto-promote owner to admin
  if (user.openId === ENV.ownerOpenId || user.email === "kazgamada@gmail.com") {
    values.role = "admin"; updateSet.role = "admin";
  } else if (user.role !== undefined) {
    values.role = user.role; updateSet.role = user.role;
  }

  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return r[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─────────────────────────────────────────────
// Skills
// ─────────────────────────────────────────────
export async function getSkillsByUser(authorId: number): Promise<Skill[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skills).where(eq(skills.authorId, authorId)).orderBy(desc(skills.updatedAt));
}

export async function getAllSkills(): Promise<Skill[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skills).orderBy(desc(skills.updatedAt));
}

export async function getSkillById(id: string): Promise<Skill | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(skills).where(eq(skills.id, id)).limit(1);
  return r[0];
}

export async function createSkill(data: InsertSkill): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(skills).values(data);
}

export async function updateSkill(id: string, data: Partial<InsertSkill>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(skills).set(data).where(eq(skills.id, id));
}

export async function deleteSkill(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(skills).where(eq(skills.id, id));
}

// ─────────────────────────────────────────────
// Skill Versions
// ─────────────────────────────────────────────
export async function getVersionsBySkill(skillId: string): Promise<SkillVersion[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skillVersions).where(eq(skillVersions.skillId, skillId)).orderBy(desc(skillVersions.createdAt));
}

export async function getVersionById(id: string): Promise<SkillVersion | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(skillVersions).where(eq(skillVersions.id, id)).limit(1);
  return r[0];
}

export async function createSkillVersion(data: InsertSkillVersion): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(skillVersions).values(data);
}

// ─────────────────────────────────────────────
// Execution Logs
// ─────────────────────────────────────────────
export async function getLogsBySkill(skillId: string, limit = 50): Promise<ExecutionLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(executionLogs)
    .where(eq(executionLogs.skillId, skillId))
    .orderBy(desc(executionLogs.executedAt))
    .limit(limit);
}

export async function getRecentLogs(limit = 100): Promise<ExecutionLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(executionLogs).orderBy(desc(executionLogs.executedAt)).limit(limit);
}

export async function createExecutionLog(data: InsertExecutionLog): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(executionLogs).values(data);
}

// ─────────────────────────────────────────────
// Community Skills
// ─────────────────────────────────────────────
export async function getCommunitySkills(opts?: {
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<CommunitySkill[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (opts?.search) {
    conditions.push(or(
      like(communitySkills.name, `%${opts.search}%`),
      like(communitySkills.description, `%${opts.search}%`),
    ));
  }
  if (opts?.category && opts.category !== "all") {
    conditions.push(eq(communitySkills.category, opts.category));
  }

  const query = db.select().from(communitySkills)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(communitySkills.stars))
    .limit(opts?.limit ?? 20)
    .offset(opts?.offset ?? 0);

  return query;
}

export async function upsertCommunitySkill(data: InsertCommunitySkill): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(communitySkills).values(data).onDuplicateKeyUpdate({
    set: {
      name: data.name,
      description: data.description,
      stars: data.stars,
      downloads: data.downloads,
      qualityScore: data.qualityScore,
      cachedAt: new Date(),
    },
  });
}

export async function markCommunitySkillInstalled(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(communitySkills).set({ isInstalled: true }).where(eq(communitySkills.id, id));
}

// ─────────────────────────────────────────────
// Health Thresholds
// ─────────────────────────────────────────────
export async function getHealthThresholds() {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(healthThresholds).limit(1);
  return r[0] ?? null;
}

export async function upsertHealthThresholds(data: {
  degradationThreshold: number;
  criticalThreshold: number;
  monitorInterval: number;
  autoFixEnabled: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getHealthThresholds();
  if (existing) {
    await db.update(healthThresholds).set(data).where(eq(healthThresholds.id, existing.id));
  } else {
    await db.insert(healthThresholds).values(data);
  }
}

// ─────────────────────────────────────────────
// Dashboard Stats
// ─────────────────────────────────────────────
export async function getDashboardStats(authorId?: number) {
  const db = await getDb();
  if (!db) return null;

  const skillsWhere = authorId ? eq(skills.authorId, authorId) : undefined;
  const allSkills = await db.select().from(skills).where(skillsWhere);

  const totalSkills = allSkills.length;

  // Count versions by evolution type (last 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentVersions = await db.select().from(skillVersions)
    .where(sql`${skillVersions.createdAt} >= ${since}`);

  const fixed = recentVersions.filter(v => v.evolutionType === "fix").length;
  const derived = recentVersions.filter(v => v.evolutionType === "derive").length;
  const captured = recentVersions.filter(v => v.evolutionType === "capture").length;

  // Average quality score
  const avgQuality = allSkills.length > 0
    ? allSkills.reduce((sum, s) => {
        // get latest version quality from versions
        return sum;
      }, 0)
    : 0;

  // Recent logs for timeline
  const recentLogs = await getRecentLogs(20);

  return { totalSkills, fixed, derived, captured, recentLogs };
}

// ─────────────────────────────────────────────
// Seed Demo Data
// ─────────────────────────────────────────────
export async function seedDemoData(authorId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const { nanoid } = await import("nanoid");

  const demoSkills = [
    { id: nanoid(), name: "web-scraper", description: "DOMの変更に自動適応するWebスクレイパー。3世代進化済み", category: "web", tags: '["web","scraping","dom"]', isLocal: true, isPublic: true },
    { id: nanoid(), name: "tech-search", description: "StackOverflow/GitHub/Docsを横断検索するスキル", category: "search", tags: '["search","tech","api"]', isLocal: true, isPublic: true },
    { id: nanoid(), name: "price-checker", description: "複数ECサイトの価格を比較するスキル", category: "data", tags: '["price","ecommerce","data"]', isLocal: true, isPublic: false },
    { id: nanoid(), name: "oauth-handler", description: "OAuth2認証フローを自動処理するスキル", category: "auth", tags: '["auth","oauth","security"]', isLocal: true, isPublic: false },
    { id: nanoid(), name: "email-parser", description: "メールの内容を構造化データに変換するスキル", category: "data", tags: '["email","parser","nlp"]', isLocal: true, isPublic: true },
  ];

  for (const s of demoSkills) {
    const existing = await getSkillById(s.id);
    if (existing) continue;
    await createSkill({ ...s, authorId, stars: Math.floor(Math.random() * 200), downloadCount: Math.floor(Math.random() * 1000) });

    // Create initial version
    const vId = nanoid();
    await createSkillVersion({
      id: vId,
      skillId: s.id,
      version: "v1.0",
      evolutionType: "create",
      triggerType: "manual",
      qualityScore: 60 + Math.random() * 30,
      successRate: 70 + Math.random() * 25,
      codeContent: `# ${s.name}\n\ndef execute(input):\n    # TODO: implement\n    return {"result": "success"}`,
      changeLog: "初回作成",
    });

    // Create a fix version
    const vId2 = nanoid();
    await createSkillVersion({
      id: vId2,
      skillId: s.id,
      version: "v1.1",
      parentId: vId,
      evolutionType: "fix",
      triggerType: "degradation",
      qualityScore: 70 + Math.random() * 25,
      successRate: 80 + Math.random() * 18,
      codeContent: `# ${s.name} v1.1\n\ndef execute(input):\n    # Fixed: improved error handling\n    try:\n        return {"result": "success"}\n    except Exception as e:\n        return {"error": str(e)}`,
      changeLog: "エラーハンドリング改善",
    });

    await updateSkill(s.id, { currentVersionId: vId2 });

    // Create execution logs
    for (let i = 0; i < 5; i++) {
      await createExecutionLog({
        id: nanoid(),
        skillVersionId: vId2,
        skillId: s.id,
        status: Math.random() > 0.2 ? "success" : "failure",
        executionTime: 0.5 + Math.random() * 2,
        errorMessage: Math.random() > 0.8 ? "Connection timeout" : null,
        semanticCheck: true,
        executedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      });
    }
  }

  // Seed community skills
  const communityData = [
    { id: nanoid(), name: "Advanced Web Scraper", description: "DOMの構造変更を自動検知し、セレクタを動的に更新するWebスクレイパー。3世代の自動進化で初期比300%の安定性向上。", author: "@tanaka_dev", category: "web", tags: '["web","scraping","dom"]', stars: 234, downloads: 1200, qualityScore: 84, latestVersion: "v3.2.1", generationCount: 3 },
    { id: nanoid(), name: "Tech Stack Searcher", description: "StackOverflow/GitHub/Docsを横断検索する高精度スキル。", author: "@engineer_kim", category: "search", tags: '["search","tech","api"]', stars: 456, downloads: 3400, qualityScore: 91, latestVersion: "v4.0.0", generationCount: 4 },
    { id: nanoid(), name: "Price Comparator", description: "複数ECサイトの価格をリアルタイムで比較するスキル。", author: "@data_wizard", category: "data", tags: '["price","ecommerce","comparison"]', stars: 189, downloads: 890, qualityScore: 78, latestVersion: "v2.1.0", generationCount: 2 },
    { id: nanoid(), name: "OAuth2 Handler", description: "主要プロバイダーのOAuth2フローを自動処理。", author: "@security_pro", category: "auth", tags: '["auth","oauth2","security"]', stars: 312, downloads: 2100, qualityScore: 95, latestVersion: "v5.0.0", generationCount: 5 },
    { id: nanoid(), name: "GitHub PR Analyzer", description: "GitHubのPRを自動解析し、コードレビューポイントを抽出。", author: "@devops_master", category: "ai", tags: '["github","pr","analysis","ai"]', stars: 567, downloads: 4200, qualityScore: 88, latestVersion: "v2.3.0", generationCount: 3 },
    { id: nanoid(), name: "Email Classifier", description: "受信メールをAIで自動分類・優先度付けするスキル。", author: "@ai_builder", category: "ai", tags: '["email","classification","nlp"]', stars: 423, downloads: 3100, qualityScore: 82, latestVersion: "v1.5.0", generationCount: 2 },
  ];

  for (const c of communityData) {
    await upsertCommunitySkill(c as InsertCommunitySkill);
  }
}

// ─────────────────────────────────────────────
// Storage helpers
// ─────────────────────────────────────────────
export async function getAllVersions(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: skillVersions.id,
      skillId: skillVersions.skillId,
      version: skillVersions.version,
      evolutionType: skillVersions.evolutionType,
      changeLog: skillVersions.changeLog,
      qualityScore: skillVersions.qualityScore,
      createdAt: skillVersions.createdAt,
      skillName: skills.name,
    })
    .from(skillVersions)
    .innerJoin(skills, eq(skillVersions.skillId, skills.id))
    .orderBy(desc(skillVersions.createdAt))
    .limit(limit);
  return rows;
}

// ─────────────────────────────────────────────
// User settings helpers (stored in users table as JSON)
// ─────────────────────────────────────────────
export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = result[0];
  if (!user) return null;
  return {
    displayName: user.name ?? "",
    email: user.email ?? "",
    theme: "dark",
    language: "ja",
    notifyEmail: true,
    notifyHealth: true,
    notifyUpdates: false,
  };
}

export async function updateUserSettings(
  userId: number,
  settings: {
    displayName?: string;
    theme?: string;
    language?: string;
    notifyEmail?: boolean;
    notifyHealth?: boolean;
    notifyUpdates?: boolean;
  }
) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = {};
  if (settings.displayName !== undefined) updateData.name = settings.displayName;
  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.id, userId));
  }
}

export async function findSkillByNameForUser(name: string, authorId: number): Promise<Skill | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(skills)
    .where(and(eq(skills.name, name), eq(skills.authorId, authorId)))
    .limit(1);
  return r[0];
}

// ─────────────────────────────────────────────
// User Settings (preferences + integrations)
// ─────────────────────────────────────────────
import { userSettings, InsertUserSettings, UserSettings } from "../drizzle/schema";

export async function getUserSettingsByUserId(userId: number): Promise<UserSettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return r[0];
}

export async function upsertUserSettings(
  userId: number,
  data: Partial<Omit<InsertUserSettings, "id" | "userId" | "updatedAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getUserSettingsByUserId(userId);
  if (existing) {
    await db.update(userSettings).set(data).where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values({ userId, ...data });
  }
}
