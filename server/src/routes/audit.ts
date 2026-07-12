import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { AuditEvent } from "../models/AuditEvent.js";

export const auditRouter = Router();
auditRouter.use(requireAuth);

auditRouter.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100), 300);
  const events = await AuditEvent.find({ userId: req.user!.id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json(
    events.map((e) => ({
      id: e._id.toString(),
      action: e.action,
      resourceType: e.resourceType ?? null,
      resourceId: e.resourceId ?? null,
      detail: e.detail ?? null,
      repoShas: e.repoShas ?? [],
      createdAt: e.createdAt,
    })),
  );
});
