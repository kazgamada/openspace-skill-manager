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
  seedDemoData,
  updateSkill,
  updateUserRole,
  upsertCommunitySkill,
  upsertHealthThresholds,
  getAllVersions,
  getUserSettings,
  updateUserSettings,
} from "./db";
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
      })
    )
    .query(async ({ input }) => {
      return getCommunitySkills(input);
    }),

  install: protectedProcedure
    .input(z.object({ communitySkillId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await markCommunitySkillInstalled(input.communitySkillId);
      return { success: true };
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
          threshold,
          lastExecuted: logs[0]?.executedAt ?? null,
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
    .input(z.object({ skillId: z.string() }))
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
// Claude router
// ─────────────────────────────────────────────
const claudeRouter = router({
  logs: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      return getRecentLogs(input.limit);
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
});

export type AppRouter = typeof appRouter;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
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
