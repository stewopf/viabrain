import { promises as fs } from "node:fs";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { env } from "../config/env.js";

export const mapRouter = Router();
mapRouter.use(requireAuth);

mapRouter.get("/", async (_req, res) => {
  const raw = await fs.readFile(env.repoMapConfigPath, "utf8");
  res.type("json").send(raw);
});
