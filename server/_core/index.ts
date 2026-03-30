import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

// ─── Evolution Event Bus (in-process pub/sub) ─────────────────────────────────────────────
const evolutionClients = new Set<WebSocket>();

export function broadcastEvolutionEvent(event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  Array.from(evolutionClients).forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ path, error, type, input, ctx }) {
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
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // WebSocket server for real-time evolution events
  const wss = new WebSocketServer({ noServer: true });
  wss.on("connection", (ws) => {
    evolutionClients.add(ws);
    ws.send(JSON.stringify({ type: "connected", message: "Evolution event stream connected" }));
    ws.on("close", () => evolutionClients.delete(ws));
    ws.on("error", () => evolutionClients.delete(ws));
  });

  server.on("upgrade", (req, socket, head) => {
    if (req.url === "/ws/evolution-events") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
