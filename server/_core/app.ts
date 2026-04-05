/**
 * Express app factory — used by both the standard server (index.ts)
 * and the Vercel serverless handler (api/index.ts).
 *
 * Does NOT start an HTTP server, attach WebSockets, or launch schedulers.
 */
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerLocalAuthRoutes } from "./local-auth";
import { appRouter } from "../routers";
import { createContext } from "./context";

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);
  registerLocalAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ path, error, type, ctx }) {
        const traceId = Math.random().toString(36).slice(2, 10).toUpperCase();
        const level =
          error.code === "INTERNAL_SERVER_ERROR" ? "ERROR" :
          error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN" ? "WARN" : "INFO";
        const userEmail = (ctx as { user?: { email?: string } } | undefined)?.user?.email ?? "anonymous";
        console[level === "ERROR" ? "error" : level === "WARN" ? "warn" : "log"](
          `[tRPC][${traceId}] ${level} | ${type} ${path ?? "unknown"} | code=${error.code} | user=${userEmail} | msg=${error.message}`,
          error.code === "INTERNAL_SERVER_ERROR" ? error.cause ?? error : undefined
        );
      },
    })
  );

  return app;
}
