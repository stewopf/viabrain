import fs from "node:fs/promises";
import path from "node:path";
import { createServer as createHttpServer, type Server } from "node:http";
import type { Express, NextFunction, Request, Response } from "express";
import { env } from "./config/env.js";

function isApiPath(urlPath: string): boolean {
  return urlPath === "/api" || urlPath.startsWith("/api/");
}

/** Vite middleware mode for local development (not used in production). */
export async function attachViteFrontend(app: Express): Promise<{
  listen: (port: number, host?: string, cb?: () => void) => Server;
}> {
  const clientRoot = path.join(env.root, "client");
  const httpServer = createHttpServer(app);
  const [{ createServer: createViteServer }, reactPlugin] = await Promise.all([
    import("vite"),
    import("@vitejs/plugin-react"),
  ]);

  const vite = await createViteServer({
    configFile: false,
    root: clientRoot,
    appType: "custom",
    plugins: [reactPlugin.default()],
    server: {
      middlewareMode: true,
      // Allow EC2 IP / DNS hostnames (not just localhost) when running dev on a remote host.
      allowedHosts: true,
      hmr: { server: httpServer },
    },
  });

  app.use(vite.middlewares);
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (isApiPath(req.path)) return next();
    try {
      const templatePath = path.join(clientRoot, "index.html");
      let template = await fs.readFile(templatePath, "utf-8");
      template = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).setHeader("Content-Type", "text/html").end(template);
    } catch (err) {
      vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  });

  return {
    listen(port, hostOrCb, maybeCb) {
      const host = typeof hostOrCb === "string" ? hostOrCb : undefined;
      const cb = typeof hostOrCb === "function" ? hostOrCb : maybeCb;
      if (host) return httpServer.listen(port, host, cb);
      return httpServer.listen(port, cb);
    },
  };
}
