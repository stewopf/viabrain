import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Playbook, type PlaybookSummary, type Repo } from "../api";
import "./ChatsPage.css";
import "./PlaybooksPage.css";

export function PlaybooksPage() {
  const navigate = useNavigate();
  const [playbooks, setPlaybooks] = useState<PlaybookSummary[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allSelected =
    repos.length > 0 && selectedRepoIds.length === repos.length;

  useEffect(() => {
    void (async () => {
      try {
        const [pb, repoList] = await Promise.all([
          api.listPlaybooks(),
          api.listRepos(),
        ]);
        setPlaybooks(pb);
        setRepos(repoList);
        setSelectedRepoIds(repoList.map((r) => r.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
  }, []);

  const byCategory = useMemo(() => {
    const map = new Map<string, PlaybookSummary[]>();
    for (const p of playbooks) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return [...map.entries()];
  }, [playbooks]);

  function toggleRepo(id: string) {
    setSelectedRepoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function runPlaybook(summary: PlaybookSummary) {
    if (selectedRepoIds.length === 0) {
      setError("Select at least one repository");
      return;
    }
    setBusyId(summary.id);
    setError(null);
    try {
      const full: Playbook = await api.getPlaybook(summary.id);
      const chat = await api.createChat({
        repoIds: selectedRepoIds,
        playbookId: full.id,
        title: full.title,
      });
      navigate("/", {
        state: {
          openChatId: chat.id,
          autoPrompt: full.prompt,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start playbook");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="console-content">
      <section className="builder-hero">
        <div className="builder-hero-left">
          <p className="builder-hero-kicker">Diligence playbooks</p>
          <h1 className="builder-hero-title">Repeatable PE tech review</h1>
          <p className="builder-hero-sub">
            Run structured Ask-only questionnaires across the selected VIA
            repositories. Each playbook opens a chat and sends the review
            prompt automatically.
          </p>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <div className="playbook-layout">
        <aside className="card playbook-repos">
          <div className="repo-picker-toolbar">
            <span className="repo-picker-label">Target repos</span>
            <div className="repo-picker-actions">
              <button
                type="button"
                className="linkish"
                onClick={() => setSelectedRepoIds(repos.map((r) => r.id))}
                disabled={allSelected}
              >
                Select all
              </button>
              <button
                type="button"
                className="linkish"
                onClick={() => setSelectedRepoIds([])}
                disabled={selectedRepoIds.length === 0}
              >
                Deselect all
              </button>
            </div>
          </div>
          <div className="repo-multiselect playbook-repo-grid">
            {repos.map((r) => (
              <label key={r.id} className="repo-option">
                <input
                  type="checkbox"
                  checked={selectedRepoIds.includes(r.id)}
                  onChange={() => toggleRepo(r.id)}
                />
                <span>{r.id}</span>
              </label>
            ))}
          </div>
          <p className="muted playbook-count">
            {selectedRepoIds.length} selected
          </p>
        </aside>

        <div className="playbook-groups">
          {byCategory.map(([category, items]) => (
            <section key={category} className="playbook-group">
              <h2>{category}</h2>
              <div className="playbook-grid">
                {items.map((p) => (
                  <article key={p.id} className="card playbook-card">
                    <h3>{p.title}</h3>
                    <p className="muted">{p.description}</p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busyId !== null || selectedRepoIds.length === 0}
                      onClick={() => void runPlaybook(p)}
                    >
                      {busyId === p.id ? "Starting…" : "Run playbook"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
