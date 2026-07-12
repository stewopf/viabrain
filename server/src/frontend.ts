import fs from "node:fs/promises";
import path from "node:path";
import type { Express, NextFunction, Request, Response } from "express";
import type { Server } from "node:http";
import express from "express";
import { env } from "./config/env.js";

function isApiPath(urlPath: string): boolean {
  return urlPath === "/api" || urlPath.startsWith("/api/");
}

function attachStaticFrontend(app: Express): {
  listen: (port: number, cb?: () => void) => Server;
} {
  const dist = path.join(env.root, "client", "dist");
  app.use(express.static(dist, { index: false }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (isApiPath(req.path)) return next();
    res.sendFile(path.join(dist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
  return {
    listen(port, cb) {
      return app.listen(port, cb);
    },
  };
}

/** Serve the React client from this same Express process. */
export async function attachFrontend(
  app: Express,
): Promise<{ listen: (port: number, cb?: () => void) => Server }> {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    const indexHtml = path.join(env.root, "client", "dist", "index.html");
    try {
      await fs.access(indexHtml);
    } catch {
      throw new Error(
        `Missing ${indexHtml}. Run "npm run build" before starting in production.`,
      );
    }
    return attachStaticFrontend(app);
  }

  // Dev-only Vite middleware — keep in a separate module so production
  // startup never loads vite / @vitejs/plugin-react.
  const { attachViteFrontend } = await import("./frontendDev.js");
  return attachViteFrontend(app);
}
