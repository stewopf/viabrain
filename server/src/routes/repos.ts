import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listReposWithStatus,
  loadRepoRegistry,
  syncAllRepos,
  syncRepo,
} from "../services/repos.js";
import { getAllRepoReadmes, getRepoReadme } from "../services/readmes.js";
import { writeAudit } from "../services/audit.js";

export const reposRouter = Router();

reposRouter.use(requireAuth);

reposRouter.get("/", async (_req, res) => {
  const repos = await listReposWithStatus();
  res.json(repos);
});

reposRouter.get("/readmes", async (_req, res) => {
  const readmes = await getAllRepoReadmes();
  res.json(readmes);
});

reposRouter.get("/:id/readme", async (req, res) => {
  const readme = await getRepoReadme(req.params.id);
  if (!readme) {
    res.status(404).json({ error: "Repo not found in registry" });
    return;
  }
  res.json(readme);
});

reposRouter.post("/sync-all", async (req, res) => {
  const results = await syncAllRepos();
  const repos = await listReposWithStatus();
  await writeAudit({
    req,
    userId: req.user!.id,
    username: req.user!.username,
    action: "repos.sync_all",
    detail: { results },
  });
  res.json({ results, repos });
});

reposRouter.post("/:id/sync", async (req, res) => {
  const registry = await loadRepoRegistry();
  const repo = registry.find((r) => r.id === req.params.id);
  if (!repo) {
    res.status(404).json({ error: "Repo not found in registry" });
    return;
  }
  try {
    const result = await syncRepo(repo);
    const repos = await listReposWithStatus();
    await writeAudit({
      req,
      userId: req.user!.id,
      username: req.user!.username,
      action: "repos.sync",
      resourceType: "repo",
      resourceId: repo.id,
      repoIds: [repo.id],
      detail: { sha: result.sha },
    });
    res.json({ result, repos });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
