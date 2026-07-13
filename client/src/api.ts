export type User = {
  id: string;
  username: string;
};

export type AuthConfig = {
  basicAuth: boolean;
  oktaEnabled: boolean;
};

export type Repo = {
  id: string;
  fullName: string;
  defaultBranch: string;
  branch: string;
  sha: string | null;
  syncedAt: string | null;
  status: "never" | "ok" | "error" | "syncing";
  lastError: string | null;
  path: string;
};

export type RepoReadme = {
  repoId: string;
  fullName: string;
  filename: string | null;
  content: string | null;
  missing: boolean;
  error: string | null;
};

export type Citation = {
  repoId?: string;
  path: string;
  raw: string;
};

export type RepoSha = {
  repoId: string;
  sha?: string | null;
  fullName?: string;
};

export type Chat = {
  id: string;
  title: string;
  repoIds: string[];
  playbookId: string | null;
  cursorAgentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  repoShas?: RepoSha[];
  createdAt: string;
};

export type PlaybookSummary = {
  id: string;
  title: string;
  category: string;
  description: string;
};

export type Playbook = PlaybookSummary & {
  prompt: string;
};

export type RepoMap = {
  title: string;
  summary: string;
  nodes: Array<{
    id: string;
    label: string;
    layer: string;
    role: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    label: string;
  }>;
};

export type AuditItem = {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  detail: unknown;
  repoShas: RepoSha[];
  createdAt: string;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const api = {
  authConfig: () => request<AuthConfig>("/api/auth/config"),
  me: () => request<User | null>("/api/auth/me"),
  login: (username: string, password: string) =>
    request<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () =>
    request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  listRepos: () => request<Repo[]>("/api/repos"),
  syncRepo: (id: string) =>
    request<{ repos: Repo[] }>(`/api/repos/${id}/sync`, { method: "POST" }),
  syncAllRepos: () =>
    request<{ repos: Repo[] }>("/api/repos/sync-all", { method: "POST" }),
  listChats: () => request<Chat[]>("/api/chats"),
  createChat: (input: {
    repoIds: string[];
    title?: string;
    playbookId?: string;
  }) =>
    request<Chat>("/api/chats", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  renameChat: (id: string, title: string) =>
    request<Chat>(`/api/chats/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),
  deleteChat: (id: string) =>
    request<{ ok: boolean }>(`/api/chats/${id}`, { method: "DELETE" }),
  deleteAllChats: () =>
    request<{ ok: boolean; deleted: number }>("/api/chats", {
      method: "DELETE",
    }),
  listMessages: (chatId: string) =>
    request<Message[]>(`/api/chats/${chatId}/messages`),
  listPlaybooks: () => request<PlaybookSummary[]>("/api/playbooks"),
  getPlaybook: (id: string) => request<Playbook>(`/api/playbooks/${id}`),
  getRepoMap: () => request<RepoMap>("/api/map"),
  listAudit: (limit = 100) =>
    request<AuditItem[]>(`/api/audit?limit=${limit}`),
  exportMemoUrl: (chatId: string, format: "md" | "html" = "md") =>
    `/api/chats/${chatId}/export?format=${format}`,
  listReadmes: () => request<RepoReadme[]>("/api/repos/readmes"),
  getReadme: (id: string) => request<RepoReadme>(`/api/repos/${id}/readme`),
};

export async function streamMessage(
  chatId: string,
  content: string,
  handlers: {
    onDelta: (text: string) => void;
    onDone: (meta: {
      citations: Citation[];
      repoShas: RepoSha[];
    }) => void;
    onError: (error: string) => void;
  },
): Promise<void> {
  const res = await fetch(`/api/chats/${chatId}/messages`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!res.ok || !res.body) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    handlers.onError(message);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const lines = part.split("\n");
      let event = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        const parsed = JSON.parse(data) as {
          text?: string;
          error?: string;
          citations?: Citation[];
          repoShas?: RepoSha[];
        };
        if (event === "delta" && parsed.text) handlers.onDelta(parsed.text);
        if (event === "done") {
          handlers.onDone({
            citations: parsed.citations ?? [],
            repoShas: parsed.repoShas ?? [],
          });
        }
        if (event === "error") handlers.onError(parsed.error ?? "Stream error");
      } catch {
        // ignore malformed chunks
      }
    }
  }
}
