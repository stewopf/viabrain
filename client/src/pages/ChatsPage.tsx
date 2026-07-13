import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  api,
  streamMessage,
  type Chat,
  type Message,
  type Repo,
} from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MarkdownBody } from "../components/MarkdownBody";
import { saveSelectedRepoIds } from "../selectedRepos";
import "./ChatsPage.css";

function formatRepoIds(repoIds: string[] | undefined): string {
  if (!repoIds?.length) return "No repos";
  if (repoIds.length === 1) return repoIds[0]!;
  if (repoIds.length <= 2) return repoIds.join(", ");
  return `${repoIds.length} repos`;
}

export function ChatsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Chat | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(() => {
    try {
      return localStorage.getItem("viabrain.chatHeaderCollapsed") === "1";
    } catch {
      return false;
    }
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  function toggleHeaderCollapsed() {
    setHeaderCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("viabrain.chatHeaderCollapsed", next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeId) ?? null,
    [chats, activeId],
  );

  const allSelected =
    repos.length > 0 && selectedRepoIds.length === repos.length;
  const noneSelected = selectedRepoIds.length === 0;

  async function refreshChats() {
    const list = await api.listChats();
    setChats(list);
    if (!activeId && list[0]) setActiveId(list[0].id);
  }

  useEffect(() => {
    void (async () => {
      try {
        const [chatList, repoList] = await Promise.all([
          api.listChats(),
          api.listRepos(),
        ]);
        setChats(chatList);
        setRepos(repoList);

        const navState = location.state as
          | { openChatId?: string; autoPrompt?: string }
          | null;
        if (navState?.openChatId) {
          const opened =
            chatList.find((c) => c.id === navState.openChatId) ?? null;
          setActiveId(navState.openChatId);
          setSelectedRepoIds(
            opened?.repoIds?.length
              ? opened.repoIds
              : repoList.map((r) => r.id),
          );
          navigate(location.pathname, { replace: true, state: null });
          if (navState.autoPrompt) {
            window.setTimeout(() => {
              void sendPrompt(navState.openChatId!, navState.autoPrompt!);
            }, 400);
          }
        } else if (chatList[0]) {
          setActiveId(chatList[0].id);
          setSelectedRepoIds(
            chatList[0].repoIds?.length
              ? chatList[0].repoIds
              : repoList.map((r) => r.id),
          );
        } else {
          setSelectedRepoIds(repoList.map((r) => r.id));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeChat?.repoIds?.length) return;
    setSelectedRepoIds(activeChat.repoIds);
  }, [activeChat?.id]);

  useEffect(() => {
    if (selectedRepoIds.length === 0 && repos.length === 0) return;
    saveSelectedRepoIds(selectedRepoIds);
  }, [selectedRepoIds, repos.length]);

  async function createChat() {
    if (selectedRepoIds.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const chat = await api.createChat({ repoIds: selectedRepoIds });
      setChats((prev) => [chat, ...prev]);
      setActiveId(chat.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create chat");
    } finally {
      setBusy(false);
    }
  }

  async function sendPrompt(chatId: string, content: string) {
    if (!content.trim() || busy) return;
    setBusy(true);
    setError(null);
    setStreaming("");
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      },
    ]);

    let assistant = "";
    await streamMessage(chatId, content, {
      onDelta: (text) => {
        assistant += text;
        setStreaming(assistant);
      },
      onDone: ({ citations }) => {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: assistant || "(No response)",
            citations,
            createdAt: new Date().toISOString(),
          },
        ]);
        setStreaming("");
        setBusy(false);
        void refreshChats();
      },
      onError: (msg) => {
        setError(msg);
        setStreaming("");
        setBusy(false);
      },
    });
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!activeId || !draft.trim() || busy) return;
    const content = draft.trim();
    setDraft("");
    await sendPrompt(activeId, content);
  }

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    void (async () => {
      try {
        const msgs = await api.listMessages(activeId);
        setMessages(msgs);
        setStreaming("");
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load messages");
      }
    })();
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  function toggleRepo(id: string) {
    setSelectedRepoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAllRepos() {
    setSelectedRepoIds(repos.map((r) => r.id));
  }

  function deselectAllRepos() {
    setSelectedRepoIds([]);
  }

  async function saveRename(id: string) {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      const updated = await api.renameChat(id, renameValue.trim());
      setChats((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setRenamingId(null);
    }
  }

  async function removeChat(id: string) {
    const chat = chats.find((c) => c.id === id) ?? null;
    if (!chat) return;
    setDeleteTarget(chat);
  }

  async function confirmDeleteChat() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      const id = deleteTarget.id;
      await api.deleteChat(id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function confirmDeleteAllChats() {
    setDeleting(true);
    setError(null);
    try {
      await api.deleteAllChats();
      setChats([]);
      setActiveId(null);
      setMessages([]);
      setDeleteAllOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete all failed");
      setDeleteAllOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="console-content wide chats-layout">
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete chat?"
        message={
          deleteTarget
            ? `“${deleteTarget.title}” and its message history will be permanently removed.`
            : ""
        }
        confirmLabel={deleting ? "Deleting…" : "Delete chat"}
        cancelLabel="Keep chat"
        danger
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (!deleting) void confirmDeleteChat();
        }}
      />
      <ConfirmDialog
        open={deleteAllOpen}
        title="Delete all chats?"
        message={`Permanently remove ${chats.length} chat${chats.length === 1 ? "" : "s"} and all message history. This cannot be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete all"}
        cancelLabel="Keep chats"
        danger
        onCancel={() => {
          if (!deleting) setDeleteAllOpen(false);
        }}
        onConfirm={() => {
          if (!deleting) void confirmDeleteAllChats();
        }}
      />
      <aside className="chat-sidebar card">
        <div className="chat-sidebar-head">
          <div className="chat-sidebar-title-row">
            <h2>Chats</h2>
            <button
              type="button"
              className="linkish chat-delete-all"
              disabled={chats.length === 0 || deleting}
              onClick={() => setDeleteAllOpen(true)}
            >
              Delete all
            </button>
          </div>
          <div className="repo-picker">
            <div className="repo-picker-toolbar">
              <span className="repo-picker-label">Repositories</span>
              <div className="repo-picker-actions">
                <button
                  type="button"
                  className="linkish"
                  onClick={selectAllRepos}
                  disabled={allSelected || repos.length === 0}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="linkish"
                  onClick={deselectAllRepos}
                  disabled={noneSelected}
                >
                  Deselect all
                </button>
              </div>
            </div>
            <div
              className="repo-multiselect"
              role="group"
              aria-label="Repositories for new chat"
            >
              {repos.map((r) => {
                const checked = selectedRepoIds.includes(r.id);
                return (
                  <label key={r.id} className="repo-option">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRepo(r.id)}
                    />
                    <span>{r.id}</span>
                  </label>
                );
              })}
              {repos.length === 0 && (
                <p className="muted">No repos available. Sync them first.</p>
              )}
            </div>
            <p className="repo-picker-hint muted">
              {activeChat
                ? `Active chat: ${formatRepoIds(activeChat.repoIds)}. Selection below is for New chat.`
                : `${selectedRepoIds.length} selected for New chat`}
            </p>
            <button
              type="button"
              className="btn btn-primary new-chat-btn"
              onClick={() => void createChat()}
              disabled={noneSelected || busy}
            >
              New chat
            </button>
          </div>
        </div>
        <ul className="chat-list">
          {chats.map((chat) => (
            <li
              key={chat.id}
              className={`chat-list-item${activeId === chat.id ? " active" : ""}`}
            >
              {renamingId === chat.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => void saveRename(chat.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveRename(chat.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="chat-list-main"
                  onClick={() => setActiveId(chat.id)}
                >
                  <span className="chat-list-title">{chat.title}</span>
                  <span className="chat-list-meta">
                    {formatRepoIds(chat.repoIds)}
                  </span>
                </button>
              )}
              <div className="chat-list-actions">
                <button
                  type="button"
                  title="Rename"
                  onClick={() => {
                    setRenamingId(chat.id);
                    setRenameValue(chat.title);
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  title="Delete"
                  onClick={() => void removeChat(chat.id)}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
          {chats.length === 0 && (
            <li className="muted empty-chats">No chats yet. Create one above.</li>
          )}
        </ul>
      </aside>

      <section className="chat-main">
        <div
          className={`builder-hero chat-hero${headerCollapsed ? " is-collapsed" : ""}`}
        >
          <div className="builder-hero-left">
            <p className="builder-hero-kicker">Ask only · Read only</p>
            <h1 className="builder-hero-title">
              {activeChat ? activeChat.title : "Code chat"}
            </h1>
            {!headerCollapsed && (
              <>
                <p className="builder-hero-sub">
                  {activeChat
                    ? `Exploring ${formatRepoIds(activeChat.repoIds)}${
                        activeChat.repoIds.length > 1 ? " together" : ""
                      } without modifying the filesystem.`
                    : "Select one or more synced repositories, then create a chat."}
                </p>
                <div
                  className="mode-lock"
                  title="VIA Project is permanently Ask / read-only. Mode cannot be changed."
                >
                  <span className="mode-lock-dot" aria-hidden />
                  <span>Ask · Read only</span>
                  <span className="mode-lock-badge">Locked</span>
                </div>
                {activeChat && (
                  <div className="builder-hero-actions chat-export-actions">
                    <a
                      className="builder-hero-btn ghost"
                      href={api.exportMemoUrl(activeChat.id, "md")}
                    >
                      Export memo
                      <span className="builder-hero-btn-pointer">↓</span>
                    </a>
                    <a
                      className="builder-hero-btn primary"
                      href={api.exportMemoUrl(activeChat.id, "html")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Print / PDF
                      <span className="builder-hero-btn-pointer">→</span>
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
          <button
            type="button"
            className="chat-hero-toggle"
            onClick={toggleHeaderCollapsed}
            aria-expanded={!headerCollapsed}
            title={headerCollapsed ? "Expand header" : "Collapse header"}
          >
            {headerCollapsed ? "Expand" : "Collapse"}
            <span aria-hidden>{headerCollapsed ? "▾" : "▴"}</span>
          </button>
        </div>

        <div className="card chat-panel">
          <div className="message-list">
            {messages.map((m) => (
              <div key={m.id} className={`message ${m.role}`}>
                <div className="message-role">
                  {m.role === "user" ? "You" : "VIA Project"}
                </div>
                <div className="message-body markdown">
                  {m.role === "assistant" ? (
                    <MarkdownBody>{m.content}</MarkdownBody>
                  ) : (
                    <p>{m.content}</p>
                  )}
                </div>
                {m.role === "assistant" && m.citations && m.citations.length > 0 && (
                  <div className="evidence-trail">
                    <div className="evidence-label">Evidence</div>
                    <ul>
                      {m.citations.map((c) => (
                        <li key={`${c.repoId ?? ""}:${c.raw}`}>
                          <code>
                            {c.repoId ? `${c.repoId}/` : ""}
                            {c.path}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            {streaming && (
              <div className="message assistant">
                <div className="message-role">VIA Project</div>
                <div className="message-body markdown">
                  <MarkdownBody>{streaming}</MarkdownBody>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <div className="error-banner">{error}</div>}

          <form className="composer" onSubmit={(e) => void onSend(e)}>
            <textarea
              rows={3}
              placeholder={
                activeChat
                  ? activeChat.repoIds.length > 1
                    ? "Ask across these repositories…"
                    : "Ask about this codebase…"
                  : "Create or select a chat first"
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!activeChat || busy}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!activeChat || busy || !draft.trim()}
            >
              {busy ? "Thinking…" : "Send"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
