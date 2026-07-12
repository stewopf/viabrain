import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { connectDb } from "./db.js";
import { seedAdminUser } from "./services/seed.js";
import { ensureCursorHome } from "./services/cursorHome.js";
import { startRepoSyncCron } from "./services/cron.js";
import { authRouter } from "./routes/auth.js";
import { reposRouter } from "./routes/repos.js";
import { chatsRouter } from "./routes/chats.js";
import { playbooksRouter } from "./routes/playbooks.js";
import { mapRouter } from "./routes/map.js";
import { auditRouter } from "./routes/audit.js";
import { attachFrontend } from "./frontend.js";

async function main() {
  await ensureCursorHome();
  await connectDb();
  await seedAdminUser();
  startRepoSyncCron();

  const app = express();
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/repos", reposRouter);
  app.use("/api/chats", chatsRouter);
  app.use("/api/playbooks", playbooksRouter);
  app.use("/api/map", mapRouter);
  app.use("/api/audit", auditRouter);

  const frontend = await attachFrontend(app);

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    },
  );

  frontend.listen(env.port, () => {
    console.log(`[via-project] listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("[via-project] failed to start", err);
  process.exit(1);
});
