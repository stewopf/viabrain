import type { ChatDoc } from "../models/Chat.js";
import type { AuditRepoSha } from "./audit.js";

type MemoMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: Date | string;
  citations?: Array<{ repoId?: string | null; path: string; raw: string }>;
};

export function buildReviewMemoMarkdown(input: {
  chat: Pick<ChatDoc, "title" | "repoIds" | "createdAt" | "updatedAt"> & {
    _id: { toString(): string };
  };
  messages: MemoMessage[];
  username: string;
  repoShas: AuditRepoSha[];
  playbookTitle?: string | null;
}): string {
  const { chat, messages, username, repoShas, playbookTitle } = input;
  const lines: string[] = [];

  lines.push(`# VIA Project Technical Review Memo`);
  lines.push("");
  lines.push(`**Chat:** ${chat.title}`);
  lines.push(`**Reviewer:** ${username}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  if (playbookTitle) lines.push(`**Playbook:** ${playbookTitle}`);
  lines.push(`**Repositories:** ${(chat.repoIds ?? []).join(", ")}`);
  lines.push("");
  lines.push(`## Reviewed SHAs`);
  lines.push("");
  if (repoShas.length === 0) {
    lines.push("_No sync SHAs recorded yet._");
  } else {
    for (const r of repoShas) {
      lines.push(
        `- \`${r.repoId}\` @ \`${r.sha?.slice(0, 12) ?? "unknown"}\`${r.fullName ? ` (${r.fullName})` : ""}`,
      );
    }
  }
  lines.push("");
  lines.push(`## Conversation`);
  lines.push("");

  const allCitations = new Map<
    string,
    { repoId?: string | null; path: string; raw: string }
  >();

  for (const m of messages) {
    const who = m.role === "user" ? "Reviewer" : "VIA Project";
    const when = m.createdAt
      ? new Date(m.createdAt).toISOString()
      : "";
    lines.push(`### ${who}${when ? ` · ${when}` : ""}`);
    lines.push("");
    lines.push(m.content.trim() || "_(empty)_");
    lines.push("");
    if (m.citations?.length) {
      lines.push("**Evidence cited**");
      lines.push("");
      for (const c of m.citations) {
        lines.push(`- \`${c.raw}\``);
        allCitations.set(`${c.repoId ?? ""}:${c.path}`, c);
      }
      lines.push("");
    }
  }

  lines.push(`## Evidence index`);
  lines.push("");
  if (allCitations.size === 0) {
    lines.push("_No file citations extracted from assistant answers._");
  } else {
    for (const c of allCitations.values()) {
      lines.push(
        `- ${c.repoId ? `**${c.repoId}** ` : ""}\`${c.path}\``,
      );
    }
  }
  lines.push("");
  lines.push(`---`);
  lines.push(`_Ask / read-only analysis. VIA Project does not modify source code._`);
  lines.push("");

  return lines.join("\n");
}

export function buildReviewMemoHtml(markdown: string, title: string): string {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Lightweight markdown → HTML for print (headings, code, lists, bold)
  let html = escaped
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (block) => `<ul>${block}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title.replace(/</g, "")}</title>
  <style>
    body { font-family: Manrope, system-ui, sans-serif; color: #013572; max-width: 820px; margin: 2rem auto; padding: 0 1.25rem; line-height: 1.55; }
    h1,h2,h3 { letter-spacing: -0.02em; }
    code { background: #e7f0fe; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.9em; }
    ul { padding-left: 1.25rem; }
    @media print { body { margin: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <p class="no-print"><button onclick="window.print()">Print / Save as PDF</button></p>
  <p>${html}</p>
</body>
</html>`;
}
