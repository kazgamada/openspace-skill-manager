/**
 * Local authentication route — used when OAUTH_SERVER_URL is not configured.
 * POST /api/auth/login  { email, password }
 */
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { getSessionCookieOptions } from "./cookies";

// Hardcoded owner emails — always accepted regardless of LOCAL_ADMIN_EMAIL
const OWNER_EMAILS = ["kazgamada@gmail.com"];

export function registerLocalAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ error: "email と password は必須です" });
    }

    // Guard: local auth only available when OAuth is not configured
    if (ENV.oAuthServerUrl) {
      return res.status(404).json({ error: "Not available" });
    }

    if (!ENV.localAdminPassword) {
      return res.status(503).json({
        error: "LOCAL_ADMIN_PASSWORD が設定されていません",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isOwnerEmail = OWNER_EMAILS.includes(normalizedEmail);
    const isAdminEmail = ENV.localAdminEmail
      ? normalizedEmail === ENV.localAdminEmail.toLowerCase()
      : false;

    if (!isOwnerEmail && !isAdminEmail) {
      return res.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" });
    }

    if (password !== ENV.localAdminPassword) {
      return res.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" });
    }

    const openId = `local:${normalizedEmail}`;
    const displayName = isOwnerEmail
      ? (ENV.localAdminName || "Admin")
      : (ENV.localAdminName || "Admin");

    await db.upsertUser({
      openId,
      name: displayName,
      email: normalizedEmail,
      loginMethod: "local",
      role: "admin",
      lastSignedIn: new Date(),
    });

    const token = await sdk.createSessionToken(openId, {
      name: displayName,
      expiresInMs: ONE_YEAR_MS,
    });

    res.cookie(COOKIE_NAME, token, {
      ...getSessionCookieOptions(req),
      maxAge: ONE_YEAR_MS,
    });

    return res.json({ ok: true });
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    return res.json({ ok: true });
  });
}
