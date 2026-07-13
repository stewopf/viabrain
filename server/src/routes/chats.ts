import { Router } from "express";
import { z } from "zod";
import { promises as fs } from "node:fs";
import { requireAuth } from "../middleware/auth.js";
import { Chat, resolveChatRepoIds } from "../models/Chat.js";
import { Message } from "../models/Message.js";
import { loadRepoRegistry, repoPath } from "../services/repos.js";
import { runAskTurn } from "../services/cursorAgent.js";
import { extractCitations } from "../services/citations.js";
import { snapshotRepoShas, writeAudit } from "../services/audit.js";
import {
  buildReviewMemoHtml,
  buildReviewMemoMarkdown,
} from "../services/memo.js";
import { loadPlaybooks } from "../services/playbooks.js";

export const chatsRouter = Router();

chatsRouter.use(requireAuth);

function serializeChat(c: {
  _id: { toString(): string };
  title: string;
  repoIds?: string[] | null;
  repoId?: string | null;
  playbookId?: string | null;
  cursorAgentId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: c._id.toString(),
    title: c.title,
    repoIds: resolveChatRepoIds(c),
    playbookId: c.playbookId ?? null,
    cursorAgentId: c.cursorAgentId ?? null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function defaultTitle(repoIds: string[], playbookTitle?: string): string {
  if (playbookTitle) return playbookTitle;
  if (repoIds.length === 1) return `Chat · ${repoIds[0]}`;
  if (repoIds.length <= 3) return `Chat · ${repoIds.join(", ")}`;
  return `Chat · ${repoIds.length} repos`;
}

chatsRouter.get("/", async (req, res) => {
  const chats = await Chat.find({ userId: req.user!.id })
    .sort({ updatedAt: -1 })
    .lean();
  res.json(chats.map((c) => serializeChat(c)));
});

const createSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  repoIds: z.array(z.string().min(1)).min(1),
  playbookId: z.string().min(1).optional(),
});

chatsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Select at least one repository" });
    return;
  }

  const registry = await loadRepoRegistry();
  const known = new Set(registry.map((r) => r.id));
  const repoIds = [...new Set(parsed.data.repoIds)];

  for (const id of repoIds) {
    if (!known.has(id)) {
      res.status(400).json({ error: `Unknown repoId: ${id}` });
      return;
    }
    try {
      await fs.access(repoPath(id));
    } catch {
      res.status(400).json({
        error: `Repo "${id}" is not cloned yet. Sync it from the Repos page first.`,
      });
      return;
    }
  }

  let playbookTitle: string | undefined;
  if (parsed.data.playbookId) {
    const playbooks = await loadPlaybooks();
    const pb = playbooks.find((p) => p.id === parsed.data.playbookId);
    if (!pb) {
      res.status(400).json({ error: "Unknown playbookId" });
      return;
    }
    playbookTitle = pb.title;
  }

  const chat = await Chat.create({
    userId: req.user!.id,
    title: parsed.data.title ?? defaultTitle(repoIds, playbookTitle),
    repoIds,
    playbookId: parsed.data.playbookId,
  });

  await writeAudit({
    req,
    userId: req.user!.id,
    username: req.user!.username,
    action: "chat.create",
    resourceType: "chat",
    resourceId: chat._id.toString(),
    repoIds,
    detail: { playbookId: parsed.data.playbookId ?? null },
  });

  res.status(201).json(serializeChat(chat));
});

const renameSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

chatsRouter.patch("/:id", async (req, res) => {
  const parsed = renameSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid title" });
    return;
  }

  const chat = await Chat.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.id },
    { title: parsed.data.title },
    { new: true },
  );
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }

  res.json(serializeChat(chat));
});

chatsRouter.delete("/", async (req, res) => {
  const chats = await Chat.find({ userId: req.user!.id }).select("_id").lean();
  const ids = chats.map((c) => c._id);
  if (ids.length > 0) {
    await Message.deleteMany({ chatId: { $in: ids } });
    await Chat.deleteMany({ userId: req.user!.id });
  }
  await writeAudit({
    req,
    userId: req.user!.id,
    username: req.user!.username,
    action: "chat.deleteAll",
    resourceType: "chat",
    detail: { count: ids.length },
    repoShas: [],
  });
  res.json({ ok: true, deleted: ids.length });
});

chatsRouter.delete("/:id", async (req, res) => {
  const chat = await Chat.findOneAndDelete({
    _id: req.params.id,
    userId: req.user!.id,
  });
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }
  await Message.deleteMany({ chatId: chat._id });
  await writeAudit({
    req,
    userId: req.user!.id,
    username: req.user!.username,
    action: "chat.delete",
    resourceType: "chat",
    resourceId: chat._id.toString(),
    repoIds: resolveChatRepoIds(chat),
  });
  res.json({ ok: true });
});

chatsRouter.get("/:id/messages", async (req, res) => {
  const chat = await Chat.findOne({
    _id: req.params.id,
    userId: req.user!.id,
  });
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }

  const messages = await Message.find({ chatId: chat._id })
    .sort({ createdAt: 1 })
    .lean();

  res.json(
    messages.map((m) => ({
      id: m._id.toString(),
      role: m.role,
      content: m.content,
      citations: m.citations ?? [],
      repoShas: m.repoShas ?? [],
      createdAt: m.createdAt,
    })),
  );
});

chatsRouter.get("/:id/export", async (req, res) => {
  const format = (req.query.format as string) === "html" ? "html" : "md";
  const chat = await Chat.findOne({
    _id: req.params.id,
    userId: req.user!.id,
  });
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }

  const messages = await Message.find({ chatId: chat._id })
    .sort({ createdAt: 1 })
    .lean();
  const repoIds = resolveChatRepoIds(chat);
  const repoShas = await snapshotRepoShas(repoIds);

  let playbookTitle: string | null = null;
  if (chat.playbookId) {
    const playbooks = await loadPlaybooks();
    playbookTitle =
      playbooks.find((p) => p.id === chat.playbookId)?.title ?? null;
  }

  const markdown = buildReviewMemoMarkdown({
    chat,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      createdAt: m.createdAt,
      citations: (m.citations ?? []).map((c) => ({
        repoId: c.repoId ?? undefined,
        path: c.path,
        raw: c.raw,
      })),
    })),
    username: req.user!.username,
    repoShas,
    playbookTitle,
  });

  await writeAudit({
    req,
    userId: req.user!.id,
    username: req.user!.username,
    action: "chat.export",
    resourceType: "chat",
    resourceId: chat._id.toString(),
    repoIds,
    repoShas,
    detail: { format },
  });

  const safeName = chat.title.replace(/[^\w.-]+/g, "_").slice(0, 60);
  if (format === "html") {
    const html = buildReviewMemoHtml(markdown, chat.title);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${safeName}-memo.html"`,
    );
    res.send(html);
    return;
  }

  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeName}-memo.md"`,
  );
  res.send(markdown);
});

const messageSchema = z.object({
  content: z.string().trim().min(1).max(20000),
  mode: z.unknown().optional(),
});

chatsRouter.post("/:id/messages", async (req, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid message" });
    return;
  }

  const chat = await Chat.findOne({
    _id: req.params.id,
    userId: req.user!.id,
  });
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }

  const repoIds = resolveChatRepoIds(chat);
  if (repoIds.length === 0) {
    res.status(400).json({ error: "Chat has no repositories selected" });
    return;
  }

  const repoShas = await snapshotRepoShas(repoIds);

  await Message.create({
    chatId: chat._id,
    role: "user",
    content: parsed.data.content,
    repoShas,
  });

  await writeAudit({
    req,
    userId: req.user!.id,
    username: req.user!.username,
    action: "chat.message",
    resourceType: "chat",
    resourceId: chat._id.toString(),
    repoIds,
    repoShas,
    detail: { chars: parsed.data.content.length },
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { agentId, assistantText } = await runAskTurn({
      repoIds,
      cursorAgentId: chat.cursorAgentId,
      userMessage: parsed.data.content,
      handlers: {
        onDelta: (text) => sendEvent("delta", { text }),
        onAgentId: async (id) => {
          if (chat.cursorAgentId !== id) {
            chat.cursorAgentId = id;
            await chat.save();
          }
        },
      },
    });

    const content = assistantText || "(No response)";
    const citations = extractCitations(content, repoIds);

    const assistant = await Message.create({
      chatId: chat._id,
      role: "assistant",
      content,
      citations,
      repoShas,
    });

    chat.updatedAt = new Date();
    if (!chat.cursorAgentId) {
      chat.cursorAgentId = agentId;
    }
    await chat.save();

    sendEvent("done", {
      messageId: assistant._id.toString(),
      agentId,
      citations,
      repoShas,
    });
  } catch (err) {
    sendEvent("error", {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    res.end();
  }
});
