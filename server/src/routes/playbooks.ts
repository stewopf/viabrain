import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { loadPlaybooks } from "../services/playbooks.js";

export const playbooksRouter = Router();
playbooksRouter.use(requireAuth);

playbooksRouter.get("/", async (_req, res) => {
  const playbooks = await loadPlaybooks();
  res.json(
    playbooks.map(({ id, title, category, description }) => ({
      id,
      title,
      category,
      description,
    })),
  );
});

playbooksRouter.get("/:id", async (req, res) => {
  const playbooks = await loadPlaybooks();
  const playbook = playbooks.find((p) => p.id === req.params.id);
  if (!playbook) {
    res.status(404).json({ error: "Playbook not found" });
    return;
  }
  res.json(playbook);
});
