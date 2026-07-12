import { Agent, CursorAgentError } from "@cursor/sdk";
import { env } from "../config/env.js";
import { repoPath } from "./repos.js";
import { ASK_ONLY_SYSTEM_RULES, LOCKED_AGENT_MODE } from "./askOnly.js";

function buildAskPreamble(repoIds: string[]): string {
  const paths = repoIds.map((id) => `- ${id}: ${repoPath(id)}`).join("\n");
  const multiNote =
    repoIds.length > 1
      ? `Please consider these project repositories when answering questions. They are related parts of the same product ecosystem — reason across them when relevant, and cite which repo a file belongs to.\n`
      : `Please consider this project repository when answering questions.\n`;

  return `${ASK_ONLY_SYSTEM_RULES}

Selected repositories:
${paths}

${multiNote}
User question:
`;
}

export type StreamHandlers = {
  onDelta: (text: string) => void;
  onAgentId: (agentId: string) => Promise<void> | void;
};

export async function runAskTurn(options: {
  repoIds: string[];
  cursorAgentId?: string | null;
  userMessage: string;
  handlers: StreamHandlers;
}): Promise<{ agentId: string; assistantText: string }> {
  if (!env.cursorApiKey) {
    throw new Error("CURSOR_API_KEY is not configured");
  }
  if (options.repoIds.length === 0) {
    throw new Error("At least one repository is required");
  }

  const cwd =
    options.repoIds.length === 1
      ? repoPath(options.repoIds[0]!)
      : options.repoIds.map((id) => repoPath(id));

  const prompt = `${buildAskPreamble(options.repoIds)}${options.userMessage}`;

  // Mode is hardcoded — never take mode from the client or user prompt.
  const localOptions = {
    cwd,
    settingSources: [] as [],
    sandboxOptions: { enabled: true },
  };

  const createOpts = {
    apiKey: env.cursorApiKey,
    model: { id: "composer-2.5" as const },
    mode: LOCKED_AGENT_MODE,
    local: localOptions,
  };

  let agent: Awaited<ReturnType<typeof Agent.create>>;
  try {
    if (options.cursorAgentId) {
      agent = await Agent.resume(options.cursorAgentId, createOpts);
    } else {
      agent = await Agent.create(createOpts);
    }
  } catch (err) {
    if (err instanceof CursorAgentError) {
      throw new Error(`Cursor agent startup failed: ${err.message}`);
    }
    throw err;
  }

  await options.handlers.onAgentId(agent.agentId);

  let assistantText = "";

  try {
    const run = await agent.send(prompt, {
      mode: LOCKED_AGENT_MODE,
      onDelta: ({ update }) => {
        if (update.type === "text-delta" && "text" in update && update.text) {
          assistantText += update.text;
          options.handlers.onDelta(update.text);
        }
      },
    });

    const result = await run.wait();
    if (result.status === "error") {
      throw new Error(
        `Cursor run failed (${result.id}): ${result.error?.message ?? "unknown error"}`,
      );
    }

    if (!assistantText && result.result) {
      assistantText = result.result;
      options.handlers.onDelta(result.result);
    }

    return { agentId: agent.agentId, assistantText };
  } finally {
    try {
      agent.close();
    } catch {
      // ignore dispose errors
    }
  }
}
