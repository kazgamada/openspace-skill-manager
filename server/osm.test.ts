import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(overrides?: Partial<AuthenticatedUser>): { ctx: TrpcContext; clearedCookies: { name: string; options: Record<string, unknown> }[] } {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-openid",
    email: "user@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createAdminContext() {
  return createUserContext({
    id: 99,
    openId: "admin-openid",
    email: "kazgamada@gmail.com",
    name: "Admin User",
    role: "admin",
  });
}

function createGuestContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
  return { ctx };
}

// ─────────────────────────────────────────────
// Auth tests
// ─────────────────────────────────────────────
describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const { ctx } = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("user@example.com");
    expect(result?.role).toBe("user");
  });

  it("returns admin user with admin role", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result?.role).toBe("admin");
    expect(result?.email).toBe("kazgamada@gmail.com");
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const { ctx, clearedCookies } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});

// ─────────────────────────────────────────────
// Admin guard tests
// ─────────────────────────────────────────────
describe("admin procedures - RBAC enforcement", () => {
  it("throws FORBIDDEN for non-admin users accessing admin.users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.users()).rejects.toThrow();
  });

  it("throws FORBIDDEN for non-admin users accessing admin.allSkills", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.allSkills()).rejects.toThrow();
  });

  it("throws FORBIDDEN for non-admin users accessing admin.systemLogs", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.systemLogs()).rejects.toThrow();
  });

  it("throws FORBIDDEN for non-admin users updating health thresholds", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.health.updateThresholds({
        degradationThreshold: 70,
        criticalThreshold: 50,
        monitorInterval: 60,
        autoFixEnabled: true,
      })
    ).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────
// Protected procedure tests
// ─────────────────────────────────────────────
describe("protected procedures - auth enforcement", () => {
  it("throws UNAUTHORIZED for unauthenticated users accessing skills.list", async () => {
    const { ctx } = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.skills.list()).rejects.toThrow();
  });

  it("throws UNAUTHORIZED for unauthenticated users accessing health.list", async () => {
    const { ctx } = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.health.list()).rejects.toThrow();
  });

  it("throws UNAUTHORIZED for unauthenticated users accessing dashboard.stats", async () => {
    const { ctx } = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.stats()).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────
// Public procedure tests
// ─────────────────────────────────────────────
describe("public procedures - accessible without auth", () => {
  it("community.list is accessible without authentication", async () => {
    const { ctx } = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    // Should not throw - community is public
    const result = await caller.community.list({ limit: 5, offset: 0 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Settings router tests
// ─────────────────────────────────────────────
describe("settings router", () => {
  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const { ctx } = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.settings.get()).rejects.toThrow();
  });

  it("update accepts valid settings fields without throwing validation error", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    // Should succeed or fail at DB level, but NOT throw a Zod validation error
    const result = await caller.settings.update({ theme: "dark", language: "ja" }).catch((e) => e);
    // If it resolves, it's a success; if it rejects, it should be a DB error, not validation
    if (result instanceof Error) {
      expect(result.message).not.toContain("ZodError");
    } else {
      expect(result).toMatchObject({ success: true });
    }
  });
});

// ─────────────────────────────────────────────
// Storage router tests
// ─────────────────────────────────────────────
describe("storage router", () => {
  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const { ctx } = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.storage.overview()).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────
// Claude router tests
// ─────────────────────────────────────────────
describe("claude router", () => {
  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const { ctx } = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.claude.logs({ limit: 10 })).rejects.toThrow();
  });
});
