import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  createExecutionLog,
  createSkill,
  createSkillVersion,
  deleteSkill,
  getAllSkills,
  getAllUsers,
  getCommunitySkills,
  getDashboardStats,
  getHealthThresholds,
  getLogsBySkill,
  getRecentLogs,
  getSkillById,
  getSkillsByUser,
  getVersionById,
  getVersionsBySkill,
  markCommunitySkillInstalled,
  getCommunitySkillById,
  seedDemoData,
  updateSkill,
  updateUserRole,
  upsertCommunitySkill,
  upsertHealthThresholds,
  getAllVersions,
  getUserSettings,
  updateUserSettings,
  findSkillByNameForUser,
  getUserSettingsByUserId,
  upsertUserSettings,
  getAllSkillSources,
  getSkillSourceById,
  createSkillSource,
  updateSkillSource,
  deleteSkillSource,
  getCommunitySkillsBySource,
  removeDuplicateCommunitySkills,
  deduplicateAllSkills,
  getUserIntegrations,
  addUserIntegration,
  updateUserIntegration,
  deleteUserIntegration,
  createGithubSyncLog,
  updateGithubSyncLog,
  getGithubSyncLogs,
  getDb,
} from "./db";
import { syncSkillSource } from "./github-sync";
import { runGithubCrawl } from "./github-crawl";
import { detectPatterns, generateSkillSuggestions, generateSessionId, generateSuggestionId } from "./claude-monitor";
import { detectAndSaveEvolutionProposals, findEvolutionCandidates } from "./skill-evolution";
import type { ActivityEntry } from "./claude-monitor";
import { invokeLLM } from "./_core/llm";
import { broadcastEvolutionEvent } from "./_core/index";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

// ─────────────────────────────────────────────
// Admin guard middleware
// ─────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です" });
  }
  return next({ ctx });
});

// ─────────────────────────────────────────────
// Skills router
// ─────────────────────────────────────────────
const skillsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getSkillsByUser(ctx.user.id);
  }),

  listAll: adminProcedure.query(async () => {
    return getAllSkills();
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const skill = await getSkillById(input.id);
    if (!skill) throw new TRPCError({ code: "NOT_FOUND", message: "スキルが見つかりません" });
    if (skill.authorId !== ctx.user.id && ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "アクセス権限がありません" });
    }
    return skill;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        codeContent: z.string().optional(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 重複チェック: 同名スキルが既に存在する場合はエラー
      const existing = await findSkillByNameForUser(input.name, ctx.user.id);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: `「${input.name}」という名前のスキルは既に存在します` });
      }
      const skillId = nanoid();
      const versionId = nanoid();
      await createSkill({
        id: skillId,
        name: input.name,
        description: input.description,
        category: input.category,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        authorId: ctx.user.id,
        isLocal: true,
        isPublic: input.isPublic,
        currentVersionId: versionId,
      });

      await createSkillVersion({
        id: versionId,
        skillId,
        version: "v1.0",
        evolutionType: "create",
        triggerType: "manual",
        qualityScore: 50,
        successRate: 0,
        codeContent: input.codeContent ?? `# ${input.name}\n\ndef execute(input):\n    return {"result": "success"}`,
        changeLog: "初回作成",
      });

      return { skillId, versionId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const skill = await getSkillById(input.id);
      if (!skill) throw new TRPCError({ code: "NOT_FOUND" });
      if (skill.authorId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, tags, ...rest } = input;
      await updateSkill(id, {
        ...rest,
        tags: tags ? JSON.stringify(tags) : undefined,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const skill = await getSkillById(input.id);
      if (!skill) throw new TRPCError({ code: "NOT_FOUND" });
      if (skill.authorId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await deleteSkill(input.id);
      return { success: true };
    }),

  versions: protectedProcedure
    .input(z.object({ skillId: z.string() }))
    .query(async ({ input }) => {
      return getVersionsBySkill(input.skillId);
    }),

  derive: protectedProcedure
    .input(
      z.object({
        skillId: z.string(),
        newName: z.string().min(1),
        description: z.string().optional(),
        codeContent: z.string().optional(),
        changeLog: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const parent = await getSkillById(input.skillId);
      if (!parent) throw new TRPCError({ code: "NOT_FOUND" });

      const newSkillId = nanoid();
      const newVersionId = nanoid();

      await createSkill({
        id: newSkillId,
        name: input.newName,
        description: input.description ?? parent.description,
        category: parent.category,
        tags: parent.tags,
        authorId: ctx.user.id,
        isLocal: true,
        isPublic: false,
        currentVersionId: newVersionId,
      });

      const parentVersions = await getVersionsBySkill(input.skillId);
      const latestParentVersion = parentVersions[0];

      await createSkillVersion({
        id: newVersionId,
        skillId: newSkillId,
        version: "v1.0",
        parentId: latestParentVersion?.id,
        evolutionType: "derive",
        triggerType: "manual",
        qualityScore: (latestParentVersion?.qualityScore ?? 50),
        successRate: (latestParentVersion?.successRate ?? 0),
        codeContent: input.codeContent ?? latestParentVersion?.codeContent,
        changeLog: input.changeLog ?? `${parent.name}から派生`,
      });

      return { skillId: newSkillId, versionId: newVersionId };
    }),

  fix: protectedProcedure
    .input(
      z.object({
        skillId: z.string(),
        codeContent: z.string(),
        changeLog: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const skill = await getSkillById(input.skillId);
      if (!skill) throw new TRPCError({ code: "NOT_FOUND" });

      const versions = await getVersionsBySkill(input.skillId);
      const latest = versions[0];
      const newVersion = latest ? bumpVersion(latest.version) : "v1.1";
      const newVersionId = nanoid();

      await createSkillVersion({
        id: newVersionId,
        skillId: input.skillId,
        version: newVersion,
        parentId: latest?.id,
        evolutionType: "fix",
        triggerType: "manual",
        qualityScore: Math.min(100, (latest?.qualityScore ?? 50) + 5),
        successRate: Math.min(100, (latest?.successRate ?? 0) + 5),
        codeContent: input.codeContent,
        changeLog: input.changeLog ?? "手動修復",
      });

      await updateSkill(input.skillId, { currentVersionId: newVersionId });
      return { versionId: newVersionId, version: newVersion };
    }),

  /** Revert a skill to a specific version */
  revert: protectedProcedure
    .input(z.object({ skillId: z.string(), versionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const skill = await getSkillById(input.skillId);
      if (!skill) throw new TRPCError({ code: "NOT_FOUND", message: "スキルが見つかりません" });
      if (skill.authorId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "アクセス権限がありません" });
      }
      const targetVersion = await getVersionById(input.versionId);
      if (!targetVersion || targetVersion.skillId !== input.skillId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "バージョンが見つかりません" });
      }

      // Create a new version that is a copy of the target version (rollback)
      const versions = await getVersionsBySkill(input.skillId);
      const latest = versions[0];
      const newVersionId = nanoid();
      const newVersion = latest ? bumpVersion(latest.version) : "v1.1";

      await createSkillVersion({
        id: newVersionId,
        skillId: input.skillId,
        version: newVersion,
        parentId: latest?.id,
        evolutionType: "fix",
        triggerType: "manual",
        qualityScore: targetVersion.qualityScore ?? 50,
        successRate: targetVersion.successRate ?? 0,
        codeContent: targetVersion.codeContent,
        changeLog: `ロールバック: ${targetVersion.version} → ${newVersion}`,
      });

      await updateSkill(input.skillId, { currentVersionId: newVersionId });
      return { success: true, versionId: newVersionId, version: newVersion };
    }),

  /** Upload skill to cloud (community) */
  upload: protectedProcedure
    .input(z.object({
      skillId: z.string(),
      makePublic: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const skill = await getSkillById(input.skillId);
      if (!skill) throw new TRPCError({ code: "NOT_FOUND", message: "スキルが見つかりません" });
      if (skill.authorId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "アクセス権限がありません" });
      }

      const versions = await getVersionsBySkill(input.skillId);
      const latest = versions[0];

      // Upsert to community_skills
      const communityId = nanoid();
      await upsertCommunitySkill({
        id: communityId,
        name: skill.name,
        description: skill.description ?? "",
        category: skill.category ?? "general",
        tags: skill.tags ?? "[]",
        author: ctx.user.name ?? ctx.user.email ?? "unknown",
        qualityScore: latest?.qualityScore ?? 50,
        codePreview: (latest?.codeContent ?? "").slice(0, 500),
        latestVersion: latest?.version ?? "v1.0",
      });

      // Make skill public
      if (input.makePublic) {
        await updateSkill(input.skillId, { isPublic: true });
      }

      return { success: true, communityId };
    }),

  logs: protectedProcedure
    .input(z.object({ skillId: z.string() }))
    .query(async ({ input }) => {
      return getLogsBySkill(input.skillId);
    }),

  genealogy: protectedProcedure
    .input(z.object({ skillId: z.string() }))
    .query(async ({ input }) => {
      const versions = await getVersionsBySkill(input.skillId);
      // Build nodes and edges for Cytoscape
      const nodes = versions.map((v) => ({
        id: v.id,
        label: v.version,
        evolutionType: v.evolutionType,
        qualityScore: v.qualityScore,
        changeLog: v.changeLog,
        createdAt: v.createdAt,
      }));
      const edges = versions
        .filter((v) => v.parentId)
        .map((v) => ({ source: v.parentId!, target: v.id, label: v.evolutionType }));
      return { nodes, edges };
    }),
});

// ─────────────────────────────────────────────
// Community router
// ─────────────────────────────────────────────
const communityRouter = router({
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.string().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
        sortBy: z.enum(["crawlRank", "stars", "downloads", "qualityScore", "cachedAt"]).optional(),
      })
    )
    .query(async ({ input }) => {
      return getCommunitySkills(input);
    }),

  /** BM25-style search: score by term frequency across name, description, tags */
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        category: z.string().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      // Fetch a broad candidate set then score client-side (BM25 approximation)
      const candidates = await getCommunitySkills({
        search: input.query,
        category: input.category,
        limit: 100,
        offset: 0,
      });

      const terms = input.query.toLowerCase().split(/\s+/).filter(Boolean);
      const k1 = 1.5;
      const b = 0.75;
      const avgDocLen = 50; // approximate average token count

      const scored = candidates.map((skill) => {
        const text = [
          skill.name ?? "",
          skill.description ?? "",
          skill.tags ?? "",
          skill.author ?? "",
        ].join(" ").toLowerCase();
        const tokens = text.split(/\s+/);
        const docLen = tokens.length;
        let score = 0;
        for (const term of terms) {
          const tf = tokens.filter((t) => t.includes(term)).length;
          if (tf === 0) continue;
          const idf = Math.log(1 + (100 - 1 + 0.5) / (1 + 1)); // simplified IDF
          const bm25 = idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLen))));
          score += bm25;
        }
        // Boost by quality score
        score += (skill.qualityScore ?? 0) * 0.01;
        return { ...skill, relevanceScore: Math.round(score * 100) / 100 };
      });

      const sorted = scored
        .filter((s) => s.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

      const paginated = sorted.slice(input.offset, input.offset + input.limit);
      return { results: paginated, total: sorted.length, query: input.query };
    }),

  install: protectedProcedure
    .input(z.object({ communitySkillId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // 重複チェック: コミュニティスキルのname+updatedAtが既存のマイスキルと一致する場合はスキップ
      const commSkill = await getCommunitySkillById(input.communitySkillId);
      if (commSkill) {
        const userSkills = await getSkillsByUser(ctx.user.id);
        const isDuplicate = userSkills.some((s) => s.name === commSkill.name);
        if (isDuplicate) {
          throw new TRPCError({ code: "CONFLICT", message: `「${commSkill.name}」は既にマイスキルに存在します` });
        }
      }
      await markCommunitySkillInstalled(input.communitySkillId);
      return { success: true };
    }),

  // ─── 動的ソース管理 ───────────────────────────────────────────────

  /** 登録済み外部ソース一覧 */
  listSources: publicProcedure.query(async () => {
    return getAllSkillSources();
  }),

  /** 新規ソース登録（登録後に初回同期を実行） */
  addSource: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        repoOwner: z.string().min(1).max(128),
        repoName: z.string().min(1).max(128),
        skillsPath: z.string().default("skills"),
        branch: z.string().default("main"),
        autoSync: z.boolean().default(true),
        syncIntervalHours: z.number().int().min(1).max(168).default(6),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createSkillSource({
        name: input.name,
        repoOwner: input.repoOwner,
        repoName: input.repoName,
        skillsPath: input.skillsPath,
        branch: input.branch,
        autoSync: input.autoSync,
        syncIntervalHours: input.syncIntervalHours,
        lastSyncStatus: "idle",
        totalSkills: 0,
        newSkillsLastSync: 0,
        updatedSkillsLastSync: 0,
      });
      // 初回同期を非同期で開始（ブロックしない）
      syncSkillSource(id).catch((e) =>
        console.error(`[Sync] Initial sync failed for source ${id}:`, e)
      );
      return { id, message: "ソースを登録しました。初回同期を開始します..." };
    }),

  /** ソース削除 */
  removeSource: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await deleteSkillSource(input.id);
      return { success: true };
    }),

  /** 手動同期トリガー */
  syncSource: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      // 非同期で実行（ブラウザをブロックしない）
      syncSkillSource(input.id).catch((e) =>
        console.error(`[Sync] Manual sync failed for source ${input.id}:`, e)
      );
      return { success: true, message: "同期を開始しました" };
    }),

  /** 同期状態取得（ポーリング用） */
  syncStatus: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const source = await getSkillSourceById(input.id);
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        id: source.id,
        name: source.name,
        lastSyncStatus: source.lastSyncStatus,
        lastSyncedAt: source.lastSyncedAt,
        lastSyncError: source.lastSyncError,
        totalSkills: source.totalSkills,
        newSkillsLastSync: source.newSkillsLastSync,
        updatedSkillsLastSync: source.updatedSkillsLastSync,
      };
    }),

  /** ソース設定更新（autoSync・間隔変更） */
  updateSource: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        autoSync: z.boolean().optional(),
        syncIntervalHours: z.number().int().min(1).max(168).optional(),
        name: z.string().optional(),
        branch: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateSkillSource(id, data);
      return { success: true };
    }),
  /** タイトル+更新日時が同一の重複スキルを削除 */
  removeDuplicates: protectedProcedure.mutation(async () => {
    const removed = await removeDuplicateCommunitySkills();
    return { success: true, removed };
  }),

  /** GitHub全体クロールを手動トリガー */
  triggerCrawl: adminProcedure.mutation(async ({ ctx }) => {
    // 管理者のGitHubトークンを取得
    const s = await getUserSettingsByUserId(ctx.user.id);
    let token: string | undefined;
    if (s?.integrations) {
      try {
        const intg = JSON.parse(s.integrations) as Record<string, Record<string, unknown>>;
        token = intg.github?.token as string | undefined;
      } catch {}
    }
    // 非同期で実行（ブラウザをブロックしない）
    runGithubCrawl(token).catch((e: unknown) =>
      console.error("[GithubCrawl] Manual trigger error:", e)
    );
    return { success: true, message: "GitHubクロールを開始しました。数分後にスキル広場に反映されます。" };
  }),

  /** クロール統計情報を取得 */
  getCrawlStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, lastCrawledAt: null, bySource: {} };
    const { communitySkills } = await import("../drizzle/schema");
    const { sql, max } = await import("drizzle-orm");
    const rows = await db
      .select({
        crawlSource: communitySkills.crawlSource,
        count: sql<number>`count(*)`,
        lastCrawled: max(communitySkills.lastSyncedAt),
      })
      .from(communitySkills)
      .groupBy(communitySkills.crawlSource);
    const total = rows.reduce((s, r) => s + Number(r.count), 0);
    const lastCrawledAt = rows
      .filter((r) => r.crawlSource === "github_crawl")
      .map((r) => r.lastCrawled)
      .filter(Boolean)[0] ?? null;
    const bySource: Record<string, number> = {};
    for (const r of rows) bySource[r.crawlSource ?? "unknown"] = Number(r.count);
    return { total, lastCrawledAt, bySource };
  }),
});

// ─────────────────────────────────────────────
// Health router
// ─────────────────────────────────────────────
const healthRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const userSkills = await getSkillsByUser(ctx.user.id);
    const results = await Promise.all(
      userSkills.map(async (skill) => {
        const versions = await getVersionsBySkill(skill.id);
        const latest = versions[0];
        const logs = await getLogsBySkill(skill.id, 20);
        const successCount = logs.filter((l) => l.status === "success").length;
        const successRate = logs.length > 0 ? (successCount / logs.length) * 100 : 0;
        const trend = computeTrend(logs);
        return {
          skillId: skill.id,
          skillName: skill.name,
          category: skill.category,
          qualityScore: latest?.qualityScore ?? 0,
          successRate,
          trend,
          lastExecuted: logs[0]?.executedAt ?? null,
          status: getStatus(latest?.qualityScore ?? 0),
        };
      })
    );
    return results;
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const userSkills = await getSkillsByUser(ctx.user.id);
    const thresholds = await getHealthThresholds();
    const results = await Promise.all(
      userSkills.map(async (skill) => {
        const versions = await getVersionsBySkill(skill.id);
        const latest = versions[0];
        const logs = await getLogsBySkill(skill.id, 20);
        const successCount = logs.filter((l) => l.status === "success").length;
        const successRate = logs.length > 0 ? (successCount / logs.length) * 100 : 0;
        const trend = computeTrend(logs);
        const threshold = thresholds?.degradationThreshold ?? 70;
        return {
          skillId: skill.id,
          skillName: skill.name,
          category: skill.category,
          qualityScore: latest?.qualityScore ?? 0,
          successRate,
          trend,
          executionCount: logs.length,
          totalExecutions: logs.length,
          threshold,
          lastExecuted: logs[0]?.executedAt ?? null,
          lastExecutedAt: logs[0]?.executedAt ?? null,
          status: getStatus(latest?.qualityScore ?? 0) as "healthy" | "warning" | "critical",
        };
      })
    );
    return results;
  }),

  setThreshold: protectedProcedure
    .input(z.object({ skillId: z.string(), threshold: z.number().min(0).max(100) }))
    .mutation(async ({ input }) => {
      // Store threshold in health_thresholds table (global for now)
      return { success: true };
    }),

  triggerRepair: protectedProcedure
    .input(z.object({ skillId: z.string(), triggerType: z.string().optional() }))
    .mutation(async ({ input }) => {
      const skill = await getSkillById(input.skillId);
      if (!skill) throw new TRPCError({ code: "NOT_FOUND" });
      const versions = await getVersionsBySkill(input.skillId);
      const latest = versions[0];
      const newVersionId = nanoid();
      const newVersion = latest ? bumpVersion(latest.version) : "v1.1";
      await createSkillVersion({
        id: newVersionId,
        skillId: input.skillId,
        version: newVersion,
        parentId: latest?.id,
        evolutionType: "fix",
        triggerType: "degradation",
        qualityScore: Math.min(100, (latest?.qualityScore ?? 50) + 10),
        successRate: Math.min(100, (latest?.successRate ?? 0) + 10),
        codeContent: latest?.codeContent,
        changeLog: "自動修復トリガー",
      });
      await updateSkill(input.skillId, { currentVersionId: newVersionId });
      return { success: true, versionId: newVersionId };
    }),

  thresholds: protectedProcedure.query(async () => {
    return getHealthThresholds();
  }),

  updateThresholds: adminProcedure
    .input(
      z.object({
        degradationThreshold: z.number().min(0).max(100),
        criticalThreshold: z.number().min(0).max(100),
        monitorInterval: z.number().min(1).max(1440),
        autoFixEnabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await upsertHealthThresholds(input);
      return { success: true };
    }),
});

// ─────────────────────────────────────────────
// Dashboard router
// ─────────────────────────────────────────────
const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.user.role === "admin";
    const authorId = isAdmin ? undefined : ctx.user.id;
    return getDashboardStats(authorId);
  }),

  timeline: protectedProcedure.query(async ({ ctx }) => {
    const logs = await getRecentLogs(20);
    return logs;
  }),

  /** プロジェクト情報を分析し、最適スキルをプッシュ通知する */
  monitorProject: protectedProcedure
    .input(z.object({
      projectPath: z.string().optional(),
      language: z.string().optional(),
      framework: z.string().optional(),
      taskType: z.enum(["feature", "bugfix", "refactor", "review", "test", "general"]).default("general"),
      recentFiles: z.array(z.string()).max(20).default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      // BM25スコアリングで最適スキルを推薦
      const candidates = await getSkillsByUser(ctx.user.id);
      const keywords = [
        input.language ?? "",
        input.framework ?? "",
        input.taskType,
        ...input.recentFiles.map((f) => f.split(".").pop() ?? ""),
      ].filter(Boolean).map((t) => t.toLowerCase());

      const k1 = 1.5, b = 0.75, avgDocLen = 40;
      const taskBoostMap: Record<string, string[]> = {
        feature: ["feature", "create", "implement", "build"],
        bugfix: ["fix", "debug", "repair", "error", "bug"],
        refactor: ["refactor", "clean", "quality", "lint"],
        review: ["review", "analyze", "check", "audit"],
        test: ["test", "spec", "vitest", "jest", "playwright"],
        general: [],
      };
      const boostTerms = taskBoostMap[input.taskType] ?? [];

      const scored = candidates.map((skill) => {
        const tagsArr = (() => { try { return JSON.parse(skill.tags ?? "[]") as string[]; } catch { return []; } })();
        const text = [skill.name ?? "", skill.description ?? "", tagsArr.join(" "), skill.category ?? ""].join(" ").toLowerCase();
        const tokens = text.split(/\s+/);
        const docLen = tokens.length;
        let score = 0;
        for (const term of keywords) {
          const tf = tokens.filter((t) => t.includes(term)).length;
          if (tf === 0) continue;
          const idf = Math.log(1 + (100 - 1 + 0.5) / (1 + 1));
          score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLen))));
        }
        for (const bt of boostTerms) { if (text.includes(bt)) score += 0.5; }
        return { id: skill.id, name: skill.name, description: skill.description ?? "", category: skill.category ?? "", score: Math.round(score * 100) / 100 };
      });

      const topSkills = scored
        .filter((s) => s.score > 0)
        .sort((a, b_) => b_.score - a.score)
        .slice(0, 5);

      const pushEvent = {
        type: "skill_recommendation_pushed",
        userId: ctx.user.id,
        projectPath: input.projectPath ?? "(unknown)",
        taskType: input.taskType,
        language: input.language,
        framework: input.framework,
        recommendedSkills: topSkills,
        timestamp: Date.now(),
      };

      // WebSocketでダッシュボードにブロードキャスト
      broadcastEvolutionEvent(pushEvent);

      return {
        success: true,
        recommendedSkills: topSkills,
        totalCandidates: candidates.length,
        pushedAt: new Date(),
      };
    }),
});

// ─────────────────────────────────────────────
// Storage router
// ─────────────────────────────────────────────
const storageRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const skills = await getSkillsByUser(ctx.user.id);
    const allVersions = await Promise.all(skills.map((s) => getVersionsBySkill(s.id)));
    const totalVersions = allVersions.reduce((sum, v) => sum + v.length, 0);
    return {
      totalSkills: skills.length,
      totalVersions,
      cloudSynced: true,
      lastSyncAt: new Date(),
    };
  }),

  versions: protectedProcedure
    .input(z.object({ limit: z.number().default(30) }))
    .query(async ({ input }) => {
      return getAllVersions(input.limit);
    }),

  sync: protectedProcedure.mutation(async () => {
    return { success: true, syncedAt: new Date() };
  }),
});

// ─────────────────────────────────────────────
// SKILL.md parser helper
// ─────────────────────────────────────────────
function parseSkillMd(raw: string): {
  name: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
  frontmatter: Record<string, string>;
} {
  const traceId = Math.random().toString(36).slice(2, 8).toUpperCase();
  try {
    // Extract YAML frontmatter between --- markers
    const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/m);
    const frontmatter: Record<string, string> = {};
    let content = raw.trim();

    if (fmMatch) {
      const yamlBlock = fmMatch[1];
      content = fmMatch[2].trim();
      // Simple YAML key: value parser (no nested objects)
      for (const line of yamlBlock.split("\n")) {
        const m = line.match(/^([\w-]+):\s*(.*)$/);
        if (m) frontmatter[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }

    const name = frontmatter["name"] ?? "untitled-skill";
    const description = frontmatter["description"] ?? content.split("\n")[0]?.slice(0, 200) ?? "";
    // Infer category from description keywords
    const catMap: [RegExp, string][] = [
      [/code|debug|test|lint|format/i, "development"],
      [/deploy|build|ci|cd|docker/i, "devops"],
      [/write|document|explain|summarize/i, "writing"],
      [/search|fetch|api|http/i, "integration"],
      [/analyze|review|check|audit/i, "analysis"],
    ];
    const category = catMap.find(([re]) => re.test(description))?.[1] ?? "general";
    // Extract tags from allowed-tools or description words
    const tagsRaw = frontmatter["allowed-tools"] ?? "";
    const tags = tagsRaw ? tagsRaw.split(/[,\s]+/).filter(Boolean) : [];

    return { name, description, category, tags, content, frontmatter };
  } catch (err) {
    console.error(`[SKILL.md parser][${traceId}] Parse error:`, err);
    return { name: "untitled-skill", description: "", category: "general", tags: [], content: raw, frontmatter: {} };
  }
}

// ─────────────────────────────────────────────
// Claude router
// ─────────────────────────────────────────────
const claudeRouter = router({
  logs: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      return getRecentLogs(input.limit);
    }),

  /** Parse a pasted SKILL.md text and return preview data without saving */
  previewSkillMd: protectedProcedure
    .input(z.object({ raw: z.string().min(1).max(100_000) }))
    .mutation(async ({ input }) => {
      const parsed = parseSkillMd(input.raw);
      const allowedToolsRaw = parsed.frontmatter["allowed-tools"] ?? "";
      const allowedTools = allowedToolsRaw
        ? allowedToolsRaw.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean)
        : [];
      const mappedTags = mapAllowedToolsToTags(allowedTools, parsed.description);
      return { success: true, preview: { ...parsed, tags: mappedTags, allowedTools } };
    }),

  /** Import one SKILL.md text into the user's skill library */
  importSkillMd: protectedProcedure
    .input(
      z.object({
        raw: z.string().min(1).max(100_000),
        overrideName: z.string().optional(),
        overrideDescription: z.string().optional(),
        overrideCategory: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const parsed = parseSkillMd(input.raw);
      const skillId = nanoid();
      const versionId = nanoid();
      const now = new Date();

      const name = input.overrideName ?? parsed.name;
      const description = input.overrideDescription ?? parsed.description;
      const category = input.overrideCategory ?? parsed.category;

      await createSkill({
        id: skillId,
        name,
        description,
        category,
        authorId: ctx.user.id,
        isLocal: true,
        isPublic: false,
        tags: JSON.stringify(parsed.tags),
        currentVersionId: versionId,
        createdAt: now,
        updatedAt: now,
      });

      await createSkillVersion({
        id: versionId,
        skillId,
        version: "v1.0",
        evolutionType: "create",
        triggerType: "manual",
        qualityScore: 80,
        successRate: 100,
        codeContent: input.raw,
        changeLog: `Claude Codeからインポート: ${name}`,
        createdAt: now,
      });

      return { success: true, skillId, name };
    }),

  /** Import multiple SKILL.md files at once (batch) */
  importBatch: protectedProcedure
    .input(
      z.object({
        skills: z.array(
          z.object({
            raw: z.string().min(1).max(100_000),
            filename: z.string().optional(),
          })
        ).min(1).max(50),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const results: { name: string; skillId: string; success: boolean; error?: string }[] = [];

      for (const item of input.skills) {
        try {
          const parsed = parseSkillMd(item.raw);
          const skillId = nanoid();
          const versionId = nanoid();
          const now = new Date();

          // Use filename as fallback name if frontmatter name is missing
          const name = parsed.name !== "untitled-skill"
            ? parsed.name
            : (() => {
                // Normalize path separators (Windows \ → Unix /) and strip SKILL.md suffix
                const normalized = (item.filename ?? "").replace(/\\/g, "/").replace(/\/SKILL\.md$/i, "").replace(/\.md$/i, "");
                return normalized.split("/").filter(Boolean).pop() ?? "untitled-skill";
              })();

          await createSkill({
            id: skillId,
            name,
            description: parsed.description,
            category: parsed.category,
            authorId: ctx.user.id,
            isLocal: true,
            isPublic: false,
            tags: JSON.stringify(parsed.tags),
            currentVersionId: versionId,
            createdAt: now,
            updatedAt: now,
          });

          await createSkillVersion({
            id: versionId,
            skillId,
            version: "v1.0",
            evolutionType: "create",
            triggerType: "manual",
            qualityScore: 80,
            successRate: 100,
            codeContent: item.raw,
            changeLog: `Claude Codeから一括インポート: ${name}`,
            createdAt: now,
          });

          results.push({ name, skillId, success: true });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[claude.importBatch] Failed for ${item.filename ?? "unknown"}:`, errMsg);
          results.push({ name: item.filename ?? "unknown", skillId: "", success: false, error: errMsg });
        }
      }

      const succeeded = results.filter((r) => r.success).length;
      return { success: true, total: results.length, succeeded, failed: results.length - succeeded, results };
    }),

  // ─── GitHub Skill Fetch ───────────────────────────────────────────────────
  /** Fetch SKILL.md files from a public GitHub repository */
  fetchGithubSkills: protectedProcedure
    .input(
      z.object({
        repoUrl: z.string().url(), // e.g. https://github.com/anthropics/skills
        subPath: z.string().default(""), // optional subdirectory e.g. "skills"
        maxFiles: z.number().min(1).max(30).default(20),
      })
    )
    .mutation(async ({ input }) => {
      const traceId = Math.random().toString(36).slice(2, 8).toUpperCase();
      try {
        // Parse owner/repo from URL
        const urlMatch = input.repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/);
        if (!urlMatch) throw new TRPCError({ code: "BAD_REQUEST", message: "有効なGitHub URLを入力してください" });
        const [, owner, repo] = urlMatch;

        // Recursively list files using GitHub Trees API
        const treeRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
          { headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "OSM/1.0" } }
        );
        if (!treeRes.ok) throw new TRPCError({ code: "BAD_REQUEST", message: `GitHub API エラー: ${treeRes.status} ${treeRes.statusText}` });
        const treeData = await treeRes.json() as { tree: { path: string; type: string }[] };

        // Filter SKILL.md files under subPath
        const prefix = input.subPath ? input.subPath.replace(/^\/|\/$/, "") + "/" : "";
        const skillPaths = treeData.tree
          .filter((f) => f.type === "blob" && f.path.startsWith(prefix) && /SKILL\.md$/i.test(f.path))
          .slice(0, input.maxFiles)
          .map((f) => f.path);

        if (skillPaths.length === 0) {
          return { success: true, skills: [], count: 0, message: "SKILL.mdファイルが見つかりませんでした" };
        }

        // Fetch each SKILL.md content
        const fetchedSkills: { path: string; name: string; description: string; category: string; tags: string[]; allowedTools: string[]; content: string; raw: string }[] = [];
        for (const path of skillPaths) {
          try {
            const rawRes = await fetch(
              `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`,
              { headers: { "User-Agent": "OSM/1.0" } }
            );
            if (!rawRes.ok) continue;
            const raw = await rawRes.text();
            const parsed = parseSkillMd(raw);
            // Extract allowed-tools as array
            const allowedToolsRaw = parsed.frontmatter["allowed-tools"] ?? "";
            const allowedTools = allowedToolsRaw
              ? allowedToolsRaw.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean)
              : [];
            fetchedSkills.push({
              path,
              name: parsed.name,
              description: parsed.description,
              category: parsed.category,
              tags: mapAllowedToolsToTags(allowedTools, parsed.description),
              allowedTools,
              content: parsed.content,
              raw,
            });
          } catch (e) {
            console.warn(`[claude.fetchGithubSkills][${traceId}] Skip ${path}:`, e);
          }
        }

        return {
          success: true,
          skills: fetchedSkills,
          count: fetchedSkills.length,
          repoUrl: input.repoUrl,
          owner,
          repo,
        };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error(`[claude.fetchGithubSkills][${traceId}] Error:`, err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `GitHub取得に失敗しました: ${err instanceof Error ? err.message : String(err)}` });
      }
    }),

  // ─── AI Merge ────────────────────────────────────────────────────────────
  /** Merge multiple SKILL.md contents with LLM to produce a higher-quality unified skill */
  mergeSkillsWithAI: protectedProcedure
    .input(
      z.object({
        skills: z.array(
          z.object({
            name: z.string(),
            raw: z.string().max(50_000),
          })
        ).min(2).max(5),
        targetName: z.string().optional(),
        targetDescription: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const traceId = Math.random().toString(36).slice(2, 8).toUpperCase();
      try {
        const skillsText = input.skills
          .map((s, i) => `### Source Skill ${i + 1}: ${s.name}\n\`\`\`markdown\n${s.raw.slice(0, 8000)}\n\`\`\``)
          .join("\n\n");

        const prompt = `You are an expert at creating high-quality Claude Code SKILL.md files.

You will merge the following ${input.skills.length} SKILL.md files into a single, superior skill that combines the best elements of each.

${skillsText}

Requirements for the merged skill:
1. Write a YAML frontmatter with: name, description, compatibility (claude-code-only), allowed-tools (union of all source skills)
2. Combine the best instructions, workflows, and examples from all sources
3. Remove redundancy while preserving unique value from each source
4. Use clear headings, decision trees, and examples
5. The result should be more comprehensive and actionable than any individual source
${input.targetName ? `6. Use "${input.targetName}" as the skill name` : ""}
${input.targetDescription ? `7. Use this description: "${input.targetDescription}"` : ""}

Output ONLY the merged SKILL.md content (starting with ---), no explanations.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert Claude Code skill author. Output only valid SKILL.md content." },
            { role: "user", content: prompt },
          ],
        });

        const mergedRaw = (response as { choices: { message: { content: string } }[] }).choices?.[0]?.message?.content ?? "";
        if (!mergedRaw.trim()) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AIがコンテンツを生成できませんでした" });

        const parsed = parseSkillMd(mergedRaw);
        const allowedTools = (parsed.frontmatter["allowed-tools"] ?? "")
          .split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
        const tags = mapAllowedToolsToTags(allowedTools, parsed.description);

        // Save merged skill to DB
        const skillId = nanoid();
        const versionId = nanoid();
        const now = new Date();
        const name = input.targetName ?? parsed.name;
        const description = input.targetDescription ?? parsed.description;

        await createSkill({
          id: skillId,
          name,
          description,
          category: parsed.category,
          authorId: ctx.user.id,
          isLocal: true,
          isPublic: false,
          tags: JSON.stringify(tags),
          allowedTools: JSON.stringify(allowedTools),
          mergedFrom: JSON.stringify(input.skills.map((s) => s.name)),
          currentVersionId: versionId,
          createdAt: now,
          updatedAt: now,
        });

        await createSkillVersion({
          id: versionId,
          skillId,
          version: "v1.0",
          evolutionType: "create",
          triggerType: "manual",
          qualityScore: 90,
          successRate: 100,
          codeContent: mergedRaw,
          changeLog: `AIマージ生成: ${input.skills.map((s) => s.name).join(" + ")}`,
          createdAt: now,
        });

        return { success: true, skillId, name, mergedRaw, tags, allowedTools };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error(`[claude.mergeSkillsWithAI][${traceId}] Error:`, err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `AIマージに失敗しました: ${err instanceof Error ? err.message : String(err)}` });
      }
    }),

  // ─── Diff Import ─────────────────────────────────────────────────────────
  /** Import a SKILL.md as a new version of an existing skill (diff import) */
  diffImport: protectedProcedure
    .input(
      z.object({
        existingSkillId: z.string(),
        raw: z.string().min(1).max(100_000),
        changeLog: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const traceId = Math.random().toString(36).slice(2, 8).toUpperCase();
      try {
        const existing = await getSkillById(input.existingSkillId);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "スキルが見つかりません" });
        if (existing.authorId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "このスキルを更新する権限がありません" });
        }

        // Get current version to determine next version number
        const versions = await getVersionsBySkill(input.existingSkillId);
        const latestVersion = versions[0]?.version ?? "v1.0";
        const nextVersion = bumpVersion(latestVersion);

        const parsed = parseSkillMd(input.raw);
        const allowedTools = (parsed.frontmatter["allowed-tools"] ?? "")
          .split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
        const tags = mapAllowedToolsToTags(allowedTools, parsed.description);

        const versionId = nanoid();
        const now = new Date();

        await createSkillVersion({
          id: versionId,
          skillId: input.existingSkillId,
          version: nextVersion,
          parentId: versions[0]?.id,
          evolutionType: "fix",
          triggerType: "manual",
          qualityScore: 85,
          successRate: 100,
          codeContent: input.raw,
          changeLog: input.changeLog ?? `差分インポート: ${nextVersion}`,
          createdAt: now,
        });

        // Update skill metadata with new version and tags
        await updateSkill(input.existingSkillId, {
          currentVersionId: versionId,
          tags: JSON.stringify(tags),
          allowedTools: JSON.stringify(allowedTools),
          updatedAt: now,
        });

        return { success: true, skillId: input.existingSkillId, newVersion: nextVersion, versionId };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error(`[claude.diffImport][${traceId}] Error:`, err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `差分インポートに失敗しました: ${err instanceof Error ? err.message : String(err)}` });
      }
    }),

  // ─── Auto-tag from GitHub ────────────────────────────────────────────────
  /** Import skills fetched from GitHub into user's library (with auto-tagging & diff detection) */
  importFromGithub: protectedProcedure
    .input(
      z.object({
        skills: z.array(
          z.object({
            name: z.string(),
            raw: z.string().max(100_000),
            path: z.string(),
            repoUrl: z.string(),
          })
        ).min(1).max(500),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const results: { name: string; skillId: string; version: string; action: "created" | "updated"; success: boolean; error?: string }[] = [];

      for (const item of input.skills) {
        try {
          const parsed = parseSkillMd(item.raw);
          const allowedTools = (parsed.frontmatter["allowed-tools"] ?? "")
            .split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
          const tags = mapAllowedToolsToTags(allowedTools, parsed.description);
          const name = item.name !== "untitled-skill" ? item.name : parsed.name;
          const now = new Date();

          // Check if skill with same name already exists for this user
          const existing = await findSkillByNameForUser(name, ctx.user.id);

          if (existing) {
            // Diff import: add as new version
            const versions = await getVersionsBySkill(existing.id);
            const latestVersion = versions[0]?.version ?? "v1.0";
            const nextVersion = bumpVersion(latestVersion);
            const versionId = nanoid();

            await createSkillVersion({
              id: versionId,
              skillId: existing.id,
              version: nextVersion,
              parentId: versions[0]?.id,
              evolutionType: "fix",
              triggerType: "manual",
              qualityScore: 85,
              successRate: 100,
              codeContent: item.raw,
              changeLog: `GitHub同期更新: ${item.repoUrl}/${item.path}`,
              createdAt: now,
            });
            await updateSkill(existing.id, {
              currentVersionId: versionId,
              tags: JSON.stringify(tags),
              allowedTools: JSON.stringify(allowedTools),
              sourceRepo: item.repoUrl,
              sourceFile: item.path,
              updatedAt: now,
            });
            results.push({ name, skillId: existing.id, version: nextVersion, action: "updated", success: true });
          } else {
            // New skill
            const skillId = nanoid();
            const versionId = nanoid();
            await createSkill({
              id: skillId,
              name,
              description: parsed.description,
              category: parsed.category,
              authorId: ctx.user.id,
              isLocal: true,
              isPublic: false,
              tags: JSON.stringify(tags),
              allowedTools: JSON.stringify(allowedTools),
              sourceRepo: item.repoUrl,
              sourceFile: item.path,
              currentVersionId: versionId,
              createdAt: now,
              updatedAt: now,
            });
            await createSkillVersion({
              id: versionId,
              skillId,
              version: "v1.0",
              evolutionType: "create",
              triggerType: "manual",
              qualityScore: 80,
              successRate: 100,
              codeContent: item.raw,
              changeLog: `GitHubからインポート: ${item.repoUrl}/${item.path}`,
              createdAt: now,
            });
            results.push({ name, skillId, version: "v1.0", action: "created", success: true });
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[claude.importFromGithub] Failed for ${item.name}:`, errMsg);
          results.push({ name: item.name, skillId: "", version: "", action: "created", success: false, error: errMsg });
        }
      }

      const succeeded = results.filter((r) => r.success).length;
      const created = results.filter((r) => r.action === "created" && r.success).length;
      const updated = results.filter((r) => r.action === "updated" && r.success).length;
      return { success: true, total: results.length, succeeded, failed: results.length - succeeded, created, updated, results };
    }),

  /** Recommend skills for a project based on fingerprint + BM25 scoring */
  recommend: protectedProcedure
    .input(
      z.object({
        keywords: z.array(z.string()).max(30).default([]),
        framework: z.string().optional(),
        language: z.string().optional(),
        taskType: z.enum(["feature", "bugfix", "refactor", "review", "test", "general"]).default("general"),
        topN: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ input, ctx }) => {
      const candidates = await getSkillsByUser(ctx.user.id);
      const terms = [
        ...input.keywords,
        input.framework ?? "",
        input.language ?? "",
        input.taskType,
      ].map((t) => t.toLowerCase()).filter(Boolean);

      const taskBoostMap: Record<string, string[]> = {
        feature: ["feature", "create", "implement", "build"],
        bugfix: ["fix", "debug", "repair", "error", "bug"],
        refactor: ["refactor", "clean", "quality", "lint"],
        review: ["review", "analyze", "check", "audit"],
        test: ["test", "spec", "vitest", "jest", "playwright"],
        general: [],
      };
      const boostTerms = taskBoostMap[input.taskType] ?? [];

      const k1 = 1.5;
      const b = 0.75;
      const avgDocLen = 40;

      const scored = candidates.map((skill) => {
        const tagsArr = (() => { try { return JSON.parse(skill.tags ?? "[]") as string[]; } catch { return []; } })();
        const text = [
          skill.name ?? "",
          skill.description ?? "",
          tagsArr.join(" "),
          skill.category ?? "",
        ].join(" ").toLowerCase();
        const tokens = text.split(/\s+/);
        const docLen = tokens.length;
        let score = 0;
        for (const term of terms) {
          const tf = tokens.filter((t) => t.includes(term)).length;
          if (tf === 0) continue;
          const idf = Math.log(1 + (100 - 1 + 0.5) / (1 + 1));
          const bm25 = idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLen))));
          score += bm25;
        }
        // Boost by task type keyword match
        for (const bt of boostTerms) {
          if (text.includes(bt)) score += 0.5;
        }
        // Boost by quality
        const versions = [] as { qualityScore: number }[];
        score += ((skill as unknown as Record<string, unknown>).qualityScore as number ?? 50) * 0.005;
        return { ...skill, relevanceScore: Math.round(score * 100) / 100 };
      });

      const results = scored
        .filter((s) => s.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, input.topN);

      return { results, total: scored.filter((s) => s.relevanceScore > 0).length };
    }),

  /** Generate SKILL.md text for a skill by ID */
  generateSkillMd: protectedProcedure
    .input(z.object({ skillId: z.string() }))
    .query(async ({ input, ctx }) => {
      const skill = await getSkillById(input.skillId);
      if (!skill) throw new TRPCError({ code: "NOT_FOUND", message: "スキルが見つかりません" });
      if (skill.authorId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "アクセス権限がありません" });
      }
      const versions = await getVersionsBySkill(input.skillId);
      const latest = versions[0];
      const tagsArr = (() => { try { return JSON.parse(skill.tags ?? "[]") as string[]; } catch { return []; } })();
      const allowedToolsArr = (() => { try { return JSON.parse((skill as unknown as Record<string, unknown>).allowedTools as string ?? "[]") as string[]; } catch { return []; } })();

      const frontmatter = [
        `---`,
        `name: ${skill.name}`,
        `description: ${skill.description ?? ""}`,
        allowedToolsArr.length > 0 ? `allowed-tools: ${allowedToolsArr.join(", ")}` : null,
        `---`,
      ].filter(Boolean).join("\n");

      const body = latest?.codeContent
        ? (latest.codeContent.startsWith("---") ? latest.codeContent : `${frontmatter}\n\n${latest.codeContent}`)
        : `${frontmatter}\n\n${skill.description ?? ""}\n`;

      return { skillMd: body, skillName: skill.name, version: latest?.version ?? "v1.0" };
    }),

  /** Record skill usage outcome to improve recommendation scoring */
  recordUsage: protectedProcedure
    .input(z.object({
      skillId: z.string(),
      taskType: z.string().optional(),
      outcome: z.enum(["success", "failure", "partial"]),
      effectivenessScore: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const logStatus = input.outcome === "success" ? "success" as const
        : input.outcome === "partial" ? "partial" as const
        : "failure" as const;
      // Find latest version to associate log with
      const versions = await getVersionsBySkill(input.skillId);
      const latestVersion = versions[0];
      if (!latestVersion) throw new TRPCError({ code: "NOT_FOUND", message: "スキルバージョンが見つかりません" });
      await createExecutionLog({
        id: nanoid(),
        skillId: input.skillId,
        skillVersionId: latestVersion.id,
        status: logStatus,
        executedAt: new Date(),
        errorMessage: input.effectivenessScore != null ? `effectivenessScore:${input.effectivenessScore}` : null,
      });
      return { success: true };
    }),

  /** Generate ~/.claude.json MCP server config for OSM integration */
  generateMcpConfig: protectedProcedure
    .input(z.object({
      serverUrl: z.string().url().optional(),
      includeApiKey: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const baseUrl = input.serverUrl ?? "https://your-osm-instance.manus.space";
      const config = {
        mcpServers: {
          osm: {
            command: "node",
            args: ["osm-mcp-server.js"],
            env: {
              OSM_API_URL: baseUrl,
              ...(input.includeApiKey ? { OSM_API_KEY: "<your-api-key>" } : {}),
            },
          },
        },
      };
      const orchestratorSkill = [
        `---`,
        `name: auto-skill-team`,
        `description: プロジェクトを分析して最適なスキルを自動選択し、Agent Teamを起動する。新機能開発・バグ修正・リファクタリングを開始するときに使う。`,
        `context: fork`,
        `agent: Plan`,
        `allowed-tools: Bash, mcp__osm__*`,
        `---`,
        ``,
        `## タスク: 自動スキル選択 + Agent Team 起動`,
        ``,
        `### Step 1: プロジェクト分析`,
        `プロジェクトの言語・フレームワーク・最近の変更を調べる:`,
        `- !\`git log --oneline -10\``,
        `- !\`cat package.json 2>/dev/null || cat Cargo.toml 2>/dev/null || echo "no manifest"\``,
        `- !\`ls .claude/skills/ 2>/dev/null || echo "no local skills"\``,
        ``,
        `### Step 2: スキル推薦`,
        `上記の情報をもとに mcp__osm__recommend_skills を呼び出し、タスク種別「$ARGUMENTS」に最適なスキルを上位5件取得する。`,
        ``,
        `### Step 3: スキル注入`,
        `mcp__osm__inject_skills を呼び出し、推薦スキルを .claude/skills/ に書き出す。`,
        ``,
        `### Step 4: Agent Team 起動`,
        `以下の構成で Agent Team を起動する:`,
        `- **Lead**: タスク分解・進捗管理`,
        `- **Teammate A (実装)**: 注入されたスキルを活用して $ARGUMENTS を実装`,
        `- **Teammate B (レビュー)**: セキュリティ・パフォーマンス観点でレビュー`,
        `- **Teammate C (テスト)**: テストカバレッジを確保`,
        ``,
        `### Step 5: 結果記録`,
        `完了後、mcp__osm__record_skill_usage で各スキルの有効性スコアを記録する。`,
      ].join("\n");

      return {
        config,
        configJson: JSON.stringify(config, null, 2),
        orchestratorSkillMd: orchestratorSkill,
      };
    }),

  /** Scan all repos of the authenticated user for .claude/skills/*.md files */
  scanMyGithubRepos: protectedProcedure
    .input(z.object({
      maxRepos: z.number().min(1).max(100).default(50),
      maxFilesPerRepo: z.number().min(1).max(200).default(100),
    }).optional())
    .mutation(async ({ input, ctx }) => {
      const traceId = Math.random().toString(36).slice(2, 8).toUpperCase();
      const maxRepos = input?.maxRepos ?? 50;
      const maxFilesPerRepo = input?.maxFilesPerRepo ?? 100;

      // Get GitHub token from user settings
      const s = await getUserSettingsByUserId(ctx.user.id);
      let token: string | undefined;
      if (s?.integrations) {
        try {
          const integrations = JSON.parse(s.integrations) as Record<string, Record<string, unknown>>;
          token = integrations.github?.token as string | undefined;
        } catch {}
      }
      if (!token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "GitHubトークンが設定されていません。設定→連携でGitHub Personal Access Tokenを登録してください。",
        });
      }

      const headers = {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "OSM/1.0",
      };

      // 1. Fetch user's repos
      console.log(`[claude.scanMyGithubRepos][${traceId}] Fetching repos...`);
      const reposRes = await fetch(
        `https://api.github.com/user/repos?per_page=${maxRepos}&sort=pushed&type=owner`,
        { headers }
      );
      if (!reposRes.ok) {
        const errText = await reposRes.text();
        const is401 = reposRes.status === 401;
        const is403 = reposRes.status === 403;
        let errMsg = `GitHub API エラー (${reposRes.status}): ${errText.slice(0, 200)}`;
        if (is401) errMsg = `GitHubトークンが無効または期限切れです。「設定 → 連携 → GitHub」でPersonal Access Tokenを再登録してください。`;
        if (is403) errMsg = `GitHub APIのアクセス権限が不足しています。トークンに「repo」スコープが必要です。`;
        throw new TRPCError({ code: "BAD_REQUEST", message: errMsg });
      }
      const repos = await reposRes.json() as { name: string; full_name: string; html_url: string; default_branch: string }[];
      console.log(`[claude.scanMyGithubRepos][${traceId}] Found ${repos.length} repos`);

      // 2. For each repo, check for .claude/skills/*.md using Git Tree API
      const allSkills: {
        name: string;
        path: string;
        raw: string;
        repoUrl: string;
        repoName: string;
        tags: string[];
        allowedTools: string[];
        category: string;
        description: string;
      }[] = [];

      const CONCURRENCY = 5;
      for (let i = 0; i < repos.length; i += CONCURRENCY) {
        const batch = repos.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (repo) => {
          try {
            const treeRes = await fetch(
              `https://api.github.com/repos/${repo.full_name}/git/trees/${repo.default_branch}?recursive=1`,
              { headers }
            );
            if (!treeRes.ok) return;
            const treeData = await treeRes.json() as { tree: { path: string; type: string }[] };
            const mdFiles = (treeData.tree ?? []).filter((f) =>
              f.type === "blob" &&
              /^(\.claude\/skills\/.*\.md|skills\/.*\.md)$/i.test(f.path)
            ).slice(0, maxFilesPerRepo);

            if (mdFiles.length === 0) return;
            console.log(`[claude.scanMyGithubRepos][${traceId}] ${repo.full_name}: ${mdFiles.length} skill files`);

            await Promise.all(mdFiles.map(async (file) => {
              try {
                const rawRes = await fetch(
                  `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}/${file.path}`,
                  { headers }
                );
                if (!rawRes.ok) return;
                const raw = await rawRes.text();
                if (raw.length < 10) return;

                // Parse frontmatter
                const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
                let name = file.path.split("/").pop()?.replace(/\.md$/i, "") ?? file.path;
                let description = "";
                let allowedTools: string[] = [];
                let tags: string[] = [];
                let category = "imported";

                if (fmMatch) {
                  const fm = fmMatch[1];
                  const nameMatch = fm.match(/^name:\s*(.+)$/m);
                  if (nameMatch) name = nameMatch[1].trim();
                  const descMatch = fm.match(/^description:\s*(.+)$/m);
                  if (descMatch) description = descMatch[1].trim();
                  const toolsMatch = fm.match(/^allowed-tools:\s*(.+)$/m);
                  if (toolsMatch) allowedTools = toolsMatch[1].split(",").map((t) => t.trim()).filter(Boolean);
                }

                // Auto-tag from allowed-tools
                const TOOL_TAG_MAP: Record<string, string[]> = {
                  Bash: ["shell", "cli"], Read: ["file", "read"], Write: ["file", "write"],
                  Edit: ["file", "edit"], WebSearch: ["web", "search"], WebFetch: ["web", "fetch"],
                  Task: ["agent", "orchestration"], TodoRead: ["todo", "task"], TodoWrite: ["todo", "task"],
                  Grep: ["search", "code"], Glob: ["file", "search"],
                };
                const autoTags = new Set<string>();
                for (const tool of allowedTools) {
                  for (const tag of (TOOL_TAG_MAP[tool] ?? [])) autoTags.add(tag);
                }
                tags = Array.from(autoTags);

                allSkills.push({ name, path: file.path, raw, repoUrl: repo.html_url, repoName: repo.full_name, tags, allowedTools, category, description });
              } catch (e) {
                console.warn(`[claude.scanMyGithubRepos][${traceId}] Skip ${file.path}:`, e);
              }
            }));
          } catch (e) {
            console.warn(`[claude.scanMyGithubRepos][${traceId}] Skip repo ${repo.full_name}:`, e);
          }
        }));
      }

      console.log(`[claude.scanMyGithubRepos][${traceId}] Total skills found: ${allSkills.length}`);
      return {
        skills: allSkills,
        reposScanned: repos.length,
        reposWithSkills: Array.from(new Set(allSkills.map((s) => s.repoName))).length,
      };
    }),

  /** Parse a .mcp.json or ~/.claude.json snippet and return server list */
  parseMcpConfig: protectedProcedure
    .input(z.object({ raw: z.string().min(1).max(200_000) }))
    .mutation(async ({ input }) => {
      const traceId = Math.random().toString(36).slice(2, 8).toUpperCase();
      try {
        const parsed = JSON.parse(input.raw);
        // Support both .mcp.json format and ~/.claude.json format
        const mcpServers: Record<string, unknown> =
          parsed.mcpServers ??
          parsed.mcp?.servers ??
          {};

        const servers = Object.entries(mcpServers).map(([serverName, cfg]) => {
          const c = cfg as Record<string, unknown>;
          return {
            name: serverName,
            transport: c.url ? "http" : c.command ? "stdio" : "unknown",
            command: c.command as string | undefined,
            args: c.args as string[] | undefined,
            url: c.url as string | undefined,
            envKeys: c.env ? Object.keys(c.env as object) : [],
          };
        });

        return { success: true, servers, count: servers.length };
      } catch (err) {
        console.error(`[claude.parseMcpConfig][${traceId}] Parse error:`, err);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `JSONの解析に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }),
});

// ─────────────────────────────────────────────
// Settings router
// ─────────────────────────────────────────────
const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return getUserSettings(ctx.user.id);
  }),

  update: protectedProcedure
    .input(
      z.object({
        displayName: z.string().optional(),
        theme: z.string().optional(),
        language: z.string().optional(),
        notifyEmail: z.boolean().optional(),
        notifyHealth: z.boolean().optional(),
        notifyUpdates: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await updateUserSettings(ctx.user.id, input);
      return { success: true };
    }),

  // ── Integrations ──
  getIntegrations: protectedProcedure.query(async ({ ctx }) => {
    const s = await getUserSettingsByUserId(ctx.user.id);
    if (!s?.integrations) return [];
    try {
      const raw = JSON.parse(s.integrations) as Record<string, Record<string, unknown>>;
      return Object.entries(raw).map(([service, cfg]) => ({
        service,
        connected: Boolean(cfg.connected),
        testedAt: (cfg.lastTestedAt as string | null) ?? null,
        config: cfg,
      }));
    } catch { return []; }
  }),

  saveIntegration: protectedProcedure
    .input(z.object({
      service: z.enum(["claude", "github", "googleDrive", "localFolder"]),
      config: z.record(z.string(), z.unknown()),
    }))
    .mutation(async ({ input, ctx }) => {
      const s = await getUserSettingsByUserId(ctx.user.id);
      let integrations: Record<string, unknown> = {};
      if (s?.integrations) {
        try { integrations = JSON.parse(s.integrations); } catch {}
      }
      integrations[input.service] = { ...integrations[input.service] as object, ...input.config, connected: true, lastTestedAt: null };
      await upsertUserSettings(ctx.user.id, { integrations: JSON.stringify(integrations) });
      return { success: true };
    }),

  testIntegration: protectedProcedure
    .input(z.object({
      service: z.enum(["claude", "github", "googleDrive", "localFolder"]),
      // Optional: pass current form values to test before saving
      config: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Simulate connection test (real implementation would call each service API)
      const s = await getUserSettingsByUserId(ctx.user.id);
      let integrations: Record<string, unknown> = {};
      if (s?.integrations) {
        try { integrations = JSON.parse(s.integrations); } catch {}
      }
      // If caller passed config (e.g. unsaved form values), merge them in for testing
      // But if a field in config is empty string, fall back to the DB value (password fields left blank = keep existing)
      const dbSvc = (integrations[input.service] as Record<string, unknown> | undefined ?? {});
      const mergedConfig: Record<string, unknown> = { ...dbSvc };
      if (input.config) {
        for (const [k, v] of Object.entries(input.config)) {
          // Only override if the incoming value is non-empty
          if (v !== "" && v !== null && v !== undefined) {
            mergedConfig[k] = v;
          }
        }
      }
      const svc = mergedConfig as Record<string, unknown>;
      let success = false;
      let message = "未設定";
      if (svc) {
        // GitHub: actually call /user endpoint to verify token
        if (input.service === "github" && svc.token) {
          try {
            const ghRes = await fetch("https://api.github.com/user", {
              headers: {
                Authorization: `token ${svc.token}`,
                Accept: "application/vnd.github.v3+json",
                "User-Agent": "OSM/1.0",
              },
            });
            if (ghRes.ok) {
              const ghUser = await ghRes.json() as { login?: string };
              success = true;
              message = `GitHub接続成功（@${ghUser.login ?? "unknown"}）`;
              // Persist username
              integrations[input.service] = { ...(svc ?? {}), username: ghUser.login };
            } else {
              const errBody = await ghRes.json() as { message?: string };
              message = `GitHub認証失敗 (${ghRes.status}): ${errBody.message ?? "Bad credentials"}。設定→連携でトークンを再登録してください。`;
            }
          } catch (e) {
            message = `GitHub接続エラー: ${e instanceof Error ? e.message : String(e)}`;
          }
        }
        // Claude: check if mcpPath or apiKey is set
        else if (input.service === "claude" && (svc.mcpPath || svc.apiKey)) { success = true; message = "Claude接続成功"; }
        // Google Drive: check if folderId is set
        else if (input.service === "googleDrive" && svc.folderId) { success = true; message = "Google Drive接続成功"; }
        // Local folder: check if path is set
        else if (input.service === "localFolder" && svc.path) { success = true; message = "ローカルフォルダ接続成功"; }
        else { message = "設定が不完全です"; }
      }
      // Persist lastTestedAt
      integrations[input.service] = { ...(svc ?? {}), lastTestedAt: new Date().toISOString(), connected: success };
      await upsertUserSettings(ctx.user.id, { integrations: JSON.stringify(integrations) });
      return { success, message };
    }),

  disconnectIntegration: protectedProcedure
    .input(z.object({ service: z.enum(["claude", "github", "googleDrive", "localFolder"]) }))
    .mutation(async ({ input, ctx }) => {
      const s = await getUserSettingsByUserId(ctx.user.id);
      let integrations: Record<string, unknown> = {};
      if (s?.integrations) {
        try { integrations = JSON.parse(s.integrations); } catch {}
      }
      delete integrations[input.service];
      await upsertUserSettings(ctx.user.id, { integrations: JSON.stringify(integrations) });
      return { success: true };
    }),

  updatePreferences: protectedProcedure
    .input(z.object({
      theme: z.string().optional(),
      language: z.string().optional(),
      notifyOnRepair: z.boolean().optional(),
      notifyOnDegradation: z.boolean().optional(),
      notifyOnCommunity: z.boolean().optional(),
      emailDigest: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await upsertUserSettings(ctx.user.id, input);
      return { success: true };
    }),

  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const s = await getUserSettingsByUserId(ctx.user.id);
    return {
      theme: s?.theme ?? "dark",
      language: s?.language ?? "ja",
      notifyOnRepair: s?.notifyOnRepair ?? true,
      notifyOnDegradation: s?.notifyOnDegradation ?? true,
      notifyOnCommunity: s?.notifyOnCommunity ?? false,
      emailDigest: s?.emailDigest ?? false,
      autoSyncGithub: s?.autoSyncGithub ?? false,
      githubSyncFrequencyHours: s?.githubSyncFrequencyHours ?? 24,
      githubLastSyncAt: s?.githubLastSyncAt ?? null,
    };
  }),

  setAutoSyncGithub: protectedProcedure
    .input(z.object({
      enabled: z.boolean(),
      frequencyHours: z.number().int().min(1).max(168).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await upsertUserSettings(ctx.user.id, {
        autoSyncGithub: input.enabled,
        ...(input.frequencyHours !== undefined ? { githubSyncFrequencyHours: input.frequencyHours } : {}),
      });
      return { success: true, enabled: input.enabled };
    }),

  getGithubSyncLogs: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
    .query(async ({ input, ctx }) => {
      return getGithubSyncLogs(ctx.user.id, input?.limit ?? 10);
    }),

  triggerGithubSync: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Get GitHub token
      const s = await getUserSettingsByUserId(ctx.user.id);
      let token: string | undefined;
      if (s?.integrations) {
        try {
          const integrations = JSON.parse(s.integrations) as Record<string, Record<string, unknown>>;
          token = integrations.github?.token as string | undefined;
        } catch {}
      }
      if (!token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "GitHubトークンが設定されていません。設定→連携でPersonal Access Tokenを登録してください。",
        });
      }

      const logId = await createGithubSyncLog(ctx.user.id);
      // Run async (don't await — return immediately so UI doesn't block)
      runGithubAutoSync(ctx.user.id, token, logId).catch((e) =>
        console.error("[GithubAutoSync] background error:", e)
      );
      return { success: true, logId };
    }),
});

// ─────────────────────────────────────────────
// Admin router
// ─────────────────────────────────────────────
const adminRouter = router({
  users: adminProcedure.query(async () => {
    return getAllUsers();
  }),

  updateUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ input }) => {
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  seedData: adminProcedure.mutation(async ({ ctx }) => {
    await seedDemoData(ctx.user.id);
    return { success: true };
  }),

  systemLogs: adminProcedure.query(async () => {
    return getRecentLogs(100);
  }),

  allSkills: adminProcedure.query(async () => {
    return getAllSkills();
  }),
  deduplicateSkills: adminProcedure.mutation(async () => {
    const result = await deduplicateAllSkills();
    return { success: true, removed: result.removed, message: `重複スキル ${result.removed} 件を削除しました` };
  }),
});

// ─────────────────────────────────────────────
// Monitor Router (Claude Code リアルタイムモニター)
// ─────────────────────────────────────────────
const monitorRouter = router({
  // アクティビティを報告してパターン検出・スキル提案を生成
  reportActivity: protectedProcedure
    .input(z.object({
      sessionId: z.string().optional(),
      sessionLabel: z.string().optional(),
      activities: z.array(z.object({
        tool: z.string(),
        input: z.string().optional(),
        output: z.string().optional(),
        timestamp: z.number(),
        isError: z.boolean().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const pool = (db as any).$client;
      const userId = ctx.user.id;
      const sessionId = input.sessionId ?? generateSessionId();

      // セッションをupsert
      const patterns = detectPatterns(input.activities as ActivityEntry[]);
      await pool.execute(
        `INSERT INTO claude_monitor_sessions (id, userId, sessionLabel, activityLog, detectedPatterns, lastActivityAt)
         VALUES (?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           activityLog = VALUES(activityLog),
           detectedPatterns = VALUES(detectedPatterns),
           lastActivityAt = NOW()`,
        [
          sessionId,
          userId,
          input.sessionLabel ?? null,
          JSON.stringify(input.activities),
          JSON.stringify(patterns),
        ]
      );

      // コミュニティスキルを取得してLLMで提案生成
      const communitySkills = await getCommunitySkills({ limit: 50, offset: 0 });
      const suggestions = await generateSkillSuggestions(
        patterns,
        communitySkills.map((s) => ({ id: s.id, name: s.name, description: s.description, tags: s.tags }))
      );

      // 既存のpending提案を削除して新しい提案を保存
      await pool.execute(
        `DELETE FROM skill_suggestions WHERE userId = ? AND status = 'pending'`,
        [userId]
      );

      for (const sug of suggestions) {
        await pool.execute(
          `INSERT INTO skill_suggestions (id, userId, sessionId, skillId, skillName, skillDescription, reason, source, confidence)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateSuggestionId(),
            userId,
            sessionId,
            sug.matchedSkillId ?? null,
            sug.skillName,
            sug.skillDescription,
            sug.reason,
            sug.source,
            sug.confidence,
          ]
        );
      }

      return { sessionId, patterns, suggestionsGenerated: suggestions.length };
    }),

  // 提案スキル一覧を取得
  getSuggestions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const pool = (db as any).$client;
    const [rows] = await pool.execute(
      `SELECT * FROM skill_suggestions WHERE userId = ? AND status = 'pending' ORDER BY confidence DESC LIMIT 20`,
      [ctx.user.id]
    );
    return rows as Array<{
      id: string; skillId: string | null; skillName: string; skillDescription: string;
      reason: string; source: string; confidence: number; createdAt: Date;
    }>;
  }),

  // 提案を却下
  dismissSuggestion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const pool = (db as any).$client;
      await pool.execute(
        `UPDATE skill_suggestions SET status = 'dismissed' WHERE id = ? AND userId = ?`,
        [input.id, ctx.user.id]
      );
      return { success: true };
    }),

  // 提案スキルをインストール（マイスキルに追加）
  installSuggestion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const pool = (db as any).$client;
      const [rows] = await pool.execute(
        `SELECT * FROM skill_suggestions WHERE id = ? AND userId = ?`,
        [input.id, ctx.user.id]
      );
      const sug = (rows as Array<{ skillId: string | null; skillName: string; skillDescription: string; source: string }>)[0];
      if (!sug) throw new Error("提案が見つかりません");

      // コミュニティスキルからインポートする場合
      if (sug.skillId) {
        const communitySkill = await getCommunitySkillById(sug.skillId);
        if (communitySkill) {
          await markCommunitySkillInstalled(sug.skillId);
          const skillId = nanoid();
          await createSkill({
            id: skillId,
            name: communitySkill.name,
            description: communitySkill.description ?? "",
            category: communitySkill.category ?? "その他",
            authorId: ctx.user.id,
            isLocal: false,
            isPublic: false,
            tags: communitySkill.tags ?? "[]",
            allowedTools: "[]",
            sourceRepo: null,
            sourceFile: null,
            mergedFrom: null,
          });
        }
      }

      await pool.execute(
        `UPDATE skill_suggestions SET status = 'installed' WHERE id = ? AND userId = ?`,
        [input.id, ctx.user.id]
      );
      return { success: true };
    }),

  // 最近のセッション一覧
  getRecentSessions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const pool = (db as any).$client;
    const [rows] = await pool.execute(
      `SELECT id, sessionLabel, detectedPatterns, lastActivityAt, createdAt
       FROM claude_monitor_sessions WHERE userId = ?
       ORDER BY lastActivityAt DESC LIMIT 10`,
      [ctx.user.id]
    );
    return (rows as Array<{
      id: string; sessionLabel: string | null; detectedPatterns: string | null;
      lastActivityAt: Date; createdAt: Date;
    }>).map((r) => ({
      ...r,
      detectedPatterns: r.detectedPatterns ? JSON.parse(r.detectedPatterns) : null,
    }));
  }),
});

// ─────────────────────────────────────────────
// Evolution Router (スキル進化提案)
// ─────────────────────────────────────────────
const evolutionRouter = router({
  // 進化提案を自動生成（バックグラウンド実行）
  detectProposals: protectedProcedure
    .mutation(async ({ ctx }) => {
      const count = await detectAndSaveEvolutionProposals(ctx.user.id);
      return { created: count };
    }),

  // 未処理の進化提案一覧を取得
  getProposals: protectedProcedure
    .input(z.object({ status: z.enum(["pending", "applied", "dismissed"]).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const pool = (db as any).$client;
      const status = input?.status ?? "pending";
      const [rows] = await pool.execute(
        `SELECT id, mySkillId, mySkillName, publicSkillIds, publicSkillNames,
                reason, evolutionScore, status, createdAt
         FROM skill_evolution_proposals
         WHERE userId = ? AND status = ?
         ORDER BY evolutionScore DESC, createdAt DESC
         LIMIT 20`,
        [ctx.user.id, status]
      );
      return (rows as Array<{
        id: string; mySkillId: string | null; mySkillName: string;
        publicSkillIds: string; publicSkillNames: string;
        reason: string; evolutionScore: number; status: string; createdAt: Date;
      }>).map((r) => ({
        ...r,
        publicSkillIds: JSON.parse(r.publicSkillIds) as string[],
        publicSkillNames: JSON.parse(r.publicSkillNames) as string[],
      }));
    }),

  // 進化提案のプレビュー（合成後コンテンツを取得）
  getProposalDetail: protectedProcedure
    .input(z.object({ proposalId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const pool = (db as any).$client;
      const [rows] = await pool.execute(
        `SELECT * FROM skill_evolution_proposals WHERE id = ? AND userId = ?`,
        [input.proposalId, ctx.user.id]
      );
      const row = (rows as Array<Record<string, unknown>>)[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        ...row,
        publicSkillIds: JSON.parse(row.publicSkillIds as string) as string[],
        publicSkillNames: JSON.parse(row.publicSkillNames as string) as string[],
      };
    }),

  // 進化提案をマイスキルに適用（ワンクリック合成）
  applyProposal: protectedProcedure
    .input(z.object({ proposalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const pool = (db as any).$client;

      // 提案を取得
      const [rows] = await pool.execute(
        `SELECT * FROM skill_evolution_proposals WHERE id = ? AND userId = ? AND status = 'pending'`,
        [input.proposalId, ctx.user.id]
      );
      const proposal = (rows as Array<Record<string, unknown>>)[0];
      if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "提案が見つかりません" });

      const mySkillId = proposal.mySkillId as string | null;
      const mergedContent = proposal.mergedContent as string;
      const mySkillName = proposal.mySkillName as string;

      if (mySkillId) {
        // 既存スキルに新バージョンとして追加
        const currentSkill = await getSkillById(mySkillId);
        if (currentSkill) {
          const newVersionId = nanoid();
          const currentVersion = currentSkill.currentVersionId
            ? (await getVersionById(currentSkill.currentVersionId))?.version ?? "v1.0"
            : "v1.0";
          const newVersion = bumpVersion(currentVersion);
          await createSkillVersion({
            id: newVersionId,
            skillId: mySkillId,
            version: newVersion,
            parentId: currentSkill.currentVersionId ?? undefined,
            evolutionType: "derive",
            triggerType: "analysis",
            qualityScore: Math.min(1, (proposal.evolutionScore as number) / 100),
            codeContent: mergedContent,
            changeLog: `進化提案を適用: ${proposal.reason as string}`,
          });
          await updateSkill(mySkillId, { currentVersionId: newVersionId });
        }
      } else {
        // 新規スキルとして作成
        const newSkillId = nanoid();
        const newVersionId = nanoid();
        await createSkill({
          id: newSkillId,
          name: `${mySkillName}（進化版）`,
          description: `進化提案から自動生成: ${proposal.reason as string}`,
          authorId: ctx.user.id,
          isLocal: true,
          isPublic: false,
          currentVersionId: newVersionId,
        });
        await createSkillVersion({
          id: newVersionId,
          skillId: newSkillId,
          version: "v1.0",
          evolutionType: "derive",
          triggerType: "analysis",
          qualityScore: Math.min(1, (proposal.evolutionScore as number) / 100),
          codeContent: mergedContent,
          changeLog: `進化提案から自動生成`,
        });
      }

      // 提案をappliedに更新
      await pool.execute(
        `UPDATE skill_evolution_proposals SET status = 'applied', updatedAt = NOW() WHERE id = ?`,
        [input.proposalId]
      );

      // WebSocket通知
      broadcastEvolutionEvent({ type: "skill_evolved", userId: ctx.user.id, skillName: mySkillName });

      return { success: true, mySkillId };
    }),

  // 進化提案を却下
  dismissProposal: protectedProcedure
    .input(z.object({ proposalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const pool = (db as any).$client;
      await pool.execute(
        `UPDATE skill_evolution_proposals SET status = 'dismissed', updatedAt = NOW() WHERE id = ? AND userId = ?`,
        [input.proposalId, ctx.user.id]
      );
      return { success: true };
    }),
});

// ─────────────────────────────────────────────
// App Router
// ─────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  skills: skillsRouter,
  community: communityRouter,
  health: healthRouter,
  dashboard: dashboardRouter,
  admin: adminRouter,
  storage: storageRouter,
  claude: claudeRouter,
  settings: settingsRouter,
  monitor: monitorRouter,
  evolution: evolutionRouter,
});

export type AppRouter = typeof appRouter;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
/**
 * Map allowed-tools list + description keywords to semantic OSM tags.
 * This ensures skills are discoverable by tool type in the community search.
 */
function mapAllowedToolsToTags(allowedTools: string[], description: string): string[] {
  const tags = new Set<string>();

  // Direct tool-to-tag mapping
  const toolTagMap: Record<string, string> = {
    Read: "file-read",
    Write: "file-write",
    Edit: "file-edit",
    Bash: "shell",
    Glob: "file-search",
    Grep: "text-search",
    WebFetch: "web",
    WebSearch: "web",
    TodoRead: "task-management",
    TodoWrite: "task-management",
    NotebookRead: "notebook",
    NotebookEdit: "notebook",
    mcp__github: "github",
    mcp__filesystem: "filesystem",
    mcp__memory: "memory",
    mcp__puppeteer: "browser-automation",
    mcp__postgres: "database",
    mcp__slack: "slack",
  };

  for (const tool of allowedTools) {
    // Exact match
    if (toolTagMap[tool]) {
      tags.add(toolTagMap[tool]);
      continue;
    }
    // Prefix match for mcp__ tools
    if (tool.startsWith("mcp__")) {
      tags.add("mcp");
      const service = tool.replace("mcp__", "").split("__")[0];
      if (service) tags.add(service);
    }
  }

  // Keyword-based tags from description
  const keywordTagMap: [RegExp, string][] = [
    [/test|spec|vitest|jest|playwright/i, "testing"],
    [/deploy|ci|cd|docker|kubernetes/i, "devops"],
    [/api|rest|graphql|http|fetch/i, "api"],
    [/database|sql|postgres|mysql|sqlite/i, "database"],
    [/security|audit|vulnerability|pentest/i, "security"],
    [/document|readme|markdown|write/i, "documentation"],
    [/refactor|clean|lint|format/i, "code-quality"],
    [/review|analyze|check/i, "analysis"],
    [/git|github|commit|pr|pull request/i, "git"],
    [/frontend|react|vue|css|html|ui/i, "frontend"],
    [/backend|server|express|fastapi/i, "backend"],
    [/cloudflare|aws|gcp|azure/i, "cloud"],
  ];

  for (const [re, tag] of keywordTagMap) {
    if (re.test(description)) tags.add(tag);
  }

  return Array.from(tags);
}

// ─────────────────────────────────────────────
// GitHub Auto Sync (background job)
// ─────────────────────────────────────────────

/**
 * Runs a full GitHub auto-sync for a user:
 * 1. Scan all repos for .claude/skills/*.md
 * 2. Diff against existing skills (by name + content hash)
 * 3. Import only new/changed skills
 * 4. Update sync log
 */
async function runGithubAutoSync(userId: number, token: string, logId: number): Promise<void> {
  const traceId = Math.random().toString(36).slice(2, 8).toUpperCase();
  console.log(`[GithubAutoSync][${traceId}] Starting for user ${userId}`);

  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "OSM/1.0",
  };

  try {
    // 1. Fetch all repos
    const reposRes = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=pushed&type=owner",
      { headers }
    );
    if (!reposRes.ok) {
      const errText = await reposRes.text();
      throw new Error(`GitHub API error (${reposRes.status}): ${errText.slice(0, 200)}`);
    }
    const repos = await reposRes.json() as { name: string; full_name: string; html_url: string; default_branch: string }[];
    console.log(`[GithubAutoSync][${traceId}] Found ${repos.length} repos`);

    // 2. Collect all skills from .claude/skills/ in each repo
    const allSkills: { name: string; path: string; raw: string; repoUrl: string; contentHash: string }[] = [];
    const CONCURRENCY = 5;
    for (let i = 0; i < repos.length; i += CONCURRENCY) {
      const batch = repos.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(async (repo) => {
        try {
          const treeRes = await fetch(
            `https://api.github.com/repos/${repo.full_name}/git/trees/${repo.default_branch}?recursive=1`,
            { headers }
          );
          if (!treeRes.ok) return;
          const tree = await treeRes.json() as { tree: { path: string; type: string; sha: string; url: string }[] };
          const skillFiles = tree.tree.filter(
            (f) => f.type === "blob" && /^\.claude\/skills\/.+\.md$/i.test(f.path)
          );
          await Promise.all(skillFiles.map(async (file) => {
            try {
              const blobRes = await fetch(file.url, { headers });
              if (!blobRes.ok) return;
              const blob = await blobRes.json() as { content?: string; encoding?: string };
              if (!blob.content || blob.encoding !== "base64") return;
              const raw = Buffer.from(blob.content.replace(/\n/g, ""), "base64").toString("utf-8");
              const parsed = parseSkillMd(raw);
              const name = parsed.name !== "untitled-skill" ? parsed.name : file.path.split("/").pop()?.replace(/\.md$/i, "") ?? "untitled-skill";
              // Simple content hash for diff detection
              const contentHash = Buffer.from(raw).toString("base64").slice(0, 32);
              allSkills.push({ name, path: file.path, raw, repoUrl: repo.html_url, contentHash });
            } catch {}
          }));
        } catch {}
      }));
    }

    console.log(`[GithubAutoSync][${traceId}] Total skills found: ${allSkills.length}`);

    // 3. Diff: skip skills whose content hasn't changed
    const existingSkills = await getSkillsByUser(userId);
    const existingByName = new Map(existingSkills.map((s) => [s.name.toLowerCase(), s]));

    const toImport: typeof allSkills = [];
    let skipped = 0;
    for (const skill of allSkills) {
      const existing = existingByName.get(skill.name.toLowerCase());
      if (existing) {
        // Check if content changed by comparing sourceFile hash stored in description
        // We store contentHash in the skill's description as a suffix: "...|hash:XXXX"
        const storedHash = existing.description?.match(/\|hash:([A-Za-z0-9+/]{32})/)?.[1];
        if (storedHash === skill.contentHash) {
          skipped++;
          continue; // No change
        }
      }
      toImport.push(skill);
    }

    console.log(`[GithubAutoSync][${traceId}] To import: ${toImport.length}, skipped (no change): ${skipped}`);

    // 4. Import changed/new skills
    let created = 0;
    let updated = 0;
    const now = new Date();

    for (const item of toImport) {
      try {
        const parsed = parseSkillMd(item.raw);
        const allowedTools = (parsed.frontmatter["allowed-tools"] ?? "")
          .split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
        const tags = mapAllowedToolsToTags(allowedTools, parsed.description);
        const descWithHash = `${parsed.description}|hash:${item.contentHash}`;
        const existing = existingByName.get(item.name.toLowerCase());

        if (existing) {
          const versions = await getVersionsBySkill(existing.id);
          const latestVersion = versions[0]?.version ?? "v1.0";
          const nextVersion = bumpVersion(latestVersion);
          const versionId = nanoid();
          await createSkillVersion({
            id: versionId,
            skillId: existing.id,
            version: nextVersion,
            parentId: versions[0]?.id,
            evolutionType: "fix",
            triggerType: "manual",
            qualityScore: 85,
            successRate: 100,
            codeContent: item.raw,
            changeLog: `GitHub自動同期: ${item.repoUrl}/${item.path}`,
            createdAt: now,
          });
          await updateSkill(existing.id, {
            currentVersionId: versionId,
            description: descWithHash,
            tags: JSON.stringify(tags),
            allowedTools: JSON.stringify(allowedTools),
            sourceRepo: item.repoUrl,
            sourceFile: item.path,
            updatedAt: now,
          });
          updated++;
        } else {
          const skillId = nanoid();
          const versionId = nanoid();
          await createSkill({
            id: skillId,
            name: item.name,
            description: descWithHash,
            category: parsed.category,
            authorId: userId,
            isLocal: true,
            isPublic: false,
            tags: JSON.stringify(tags),
            allowedTools: JSON.stringify(allowedTools),
            sourceRepo: item.repoUrl,
            sourceFile: item.path,
            currentVersionId: versionId,
            createdAt: now,
            updatedAt: now,
          });
          await createSkillVersion({
            id: versionId,
            skillId,
            version: "v1.0",
            evolutionType: "create",
            triggerType: "manual",
            qualityScore: 80,
            successRate: 100,
            codeContent: item.raw,
            changeLog: `GitHub自動同期インポート: ${item.repoUrl}/${item.path}`,
            createdAt: now,
          });
          created++;
        }
      } catch (e) {
        console.warn(`[GithubAutoSync][${traceId}] Failed to import ${item.name}:`, e);
      }
    }

    // 5. Update sync log
    await updateGithubSyncLog(logId, {
      status: "success",
      reposScanned: repos.length,
      skillsFound: allSkills.length,
      created,
      updated,
      skipped,
      finishedAt: new Date(),
    });

    console.log(`[GithubAutoSync][${traceId}] Done: created=${created}, updated=${updated}, skipped=${skipped}`);
    broadcastEvolutionEvent({ type: "github_sync_complete", userId, created, updated, skipped, timestamp: Date.now() });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[GithubAutoSync][${traceId}] Error:`, errMsg);
    await updateGithubSyncLog(logId, {
      status: "error",
      errorMessage: errMsg,
      finishedAt: new Date(),
    });
  }
}

function bumpVersion(version: string): string {
  const match = version.match(/^v(\d+)\.(\d+)(?:\.(\d+))?$/);
  if (!match) return "v1.1";
  const [, major, minor, patch] = match;
  return `v${major}.${parseInt(minor) + 1}`;
}

function computeTrend(logs: { status: string; executedAt: Date }[]): "up" | "down" | "stable" {
  if (logs.length < 4) return "stable";
  const recent = logs.slice(0, 2);
  const older = logs.slice(2, 4);
  const recentSuccess = recent.filter((l) => l.status === "success").length / recent.length;
  const olderSuccess = older.filter((l) => l.status === "success").length / older.length;
  if (recentSuccess > olderSuccess + 0.1) return "up";
  if (recentSuccess < olderSuccess - 0.1) return "down";
  return "stable";
}

function getStatus(qualityScore: number): "healthy" | "warning" | "critical" | "stopped" {
  if (qualityScore >= 80) return "healthy";
  if (qualityScore >= 60) return "warning";
  if (qualityScore > 0) return "critical";
  return "stopped";
}
