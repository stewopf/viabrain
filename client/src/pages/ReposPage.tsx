import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Repo } from "../api";
import "./ReposPage.css";

function shortSha(sha: string | null) {
  return sha ? sha.slice(0, 7) : "—";
}

function formatTime(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

type SyncProgress = {
  current: number;
  total: number;
  repoId: string | null;
  ok: number;
  failed: number;
};

export function ReposPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncingAll = syncProgress !== null;

  async function load() {
    const list = await api.listRepos();
    setRepos(list);
  }

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load repos"),
    );
  }, []);

  async function syncOne(id: string) {
    setBusyId(id);
    setError(null);
    setRepos((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "syncing", lastError: null } : r,
      ),
    );
    try {
      const { repos: next } = await api.syncRepo(id);
      setRepos(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function syncAll() {
    if (repos.length === 0 || syncingAll || busyId) return;

    setError(null);
    const ids = repos.map((r) => r.id);
    let ok = 0;
    let failed = 0;
    const failures: string[] = [];

    setSyncProgress({
      current: 0,
      total: ids.length,
      repoId: ids[0] ?? null,
      ok: 0,
      failed: 0,
    });

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      setSyncProgress({
        current: i,
        total: ids.length,
        repoId: id,
        ok,
        failed,
      });
      setRepos((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "syncing", lastError: null } : r,
        ),
      );

      try {
        const { repos: next } = await api.syncRepo(id);
        setRepos(next);
        ok += 1;
      } catch (err) {
        failed += 1;
        failures.push(
          `${id}: ${err instanceof Error ? err.message : String(err)}`,
        );
        await load().catch(() => undefined);
      }
    }

    setSyncProgress({
      current: ids.length,
      total: ids.length,
      repoId: null,
      ok,
      failed,
    });

    // Brief moment to show 100% before clearing
    await new Promise((r) => setTimeout(r, 600));
    setSyncProgress(null);

    if (failures.length > 0) {
      setError(
        `Updated ${ok}/${ids.length}. Failed: ${failures.join(" · ")}`,
      );
    }
  }

  const progressPct = syncProgress
    ? Math.round((syncProgress.current / Math.max(syncProgress.total, 1)) * 100)
    : 0;

  // While actively syncing a repo, show mid-step progress (current+partial)
  const displayPct =
    syncProgress && syncProgress.repoId
      ? Math.round(
          ((syncProgress.current + 0.35) / Math.max(syncProgress.total, 1)) *
            100,
        )
      : progressPct;

  return (
    <div className="console-content">
      <section className="builder-hero">
        <div className="builder-hero-left">
          <p className="builder-hero-kicker">Repository sync</p>
          <h1 className="builder-hero-title">Keep clones on main</h1>
          <p className="builder-hero-sub">
            Fixed catalog of stewopf repos. Sync uses the GitHub CLI to reset each
            local clone to remote main (also runs nightly). Repos cannot be
            added or removed here.
          </p>
        </div>
        <div className="builder-hero-actions">
          <a className="builder-hero-btn ghost" href="/readmes">
            Browse READMEs
            <span className="builder-hero-btn-pointer">→</span>
          </a>
          <button
            type="button"
            className="builder-hero-btn primary"
            onClick={() => void syncAll()}
            disabled={syncingAll || busyId !== null || repos.length === 0}
          >
            {syncingAll ? "Updating…" : "Update all"}
            <span className="builder-hero-btn-pointer">
              {syncingAll ? "…" : "→"}
            </span>
          </button>
        </div>
      </section>

      {syncProgress && (
        <div className="sync-progress card" aria-live="polite">
          <div className="sync-progress-head">
            <div>
              <p className="sync-progress-label">Updating repositories</p>
              <p className="sync-progress-title">
                {syncProgress.repoId
                  ? `Syncing ${syncProgress.repoId}…`
                  : "Finishing…"}
              </p>
            </div>
            <div className="sync-progress-count">
              <strong>
                {Math.min(syncProgress.current + (syncProgress.repoId ? 1 : 0), syncProgress.total)}
              </strong>
              <span> / {syncProgress.total}</span>
            </div>
          </div>
          <div
            className="sync-progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={displayPct}
            aria-label="Repository sync progress"
          >
            <div
              className="sync-progress-fill"
              style={{ width: `${Math.min(displayPct, 100)}%` }}
            />
          </div>
          <div className="sync-progress-meta">
            <span className="muted">
              {syncProgress.ok} ok
              {syncProgress.failed > 0
                ? ` · ${syncProgress.failed} failed`
                : ""}
            </span>
            <span className="sync-progress-pct">{displayPct}%</span>
          </div>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="repo-grid">
        {repos.map((repo) => {
          const isActive =
            busyId === repo.id ||
            (syncProgress?.repoId === repo.id && syncingAll);
          return (
            <article
              key={repo.id}
              className={`card repo-card${isActive ? " is-syncing" : ""}`}
            >
              <div className="repo-card-top">
                <h3>{repo.id}</h3>
                <span
                  className={`repo-status ${isActive ? "syncing" : repo.status}`}
                >
                  {isActive ? "syncing" : repo.status}
                </span>
              </div>
              <p className="muted">{repo.fullName}</p>
              <dl className="repo-meta">
                <div>
                  <dt>Branch</dt>
                  <dd>{repo.branch}</dd>
                </div>
                <div>
                  <dt>SHA</dt>
                  <dd>
                    <code>{shortSha(repo.sha)}</code>
                  </dd>
                </div>
                <div>
                  <dt>Synced</dt>
                  <dd>{formatTime(repo.syncedAt)}</dd>
                </div>
              </dl>
              {repo.lastError && !isActive && (
                <p className="repo-error">{repo.lastError}</p>
              )}
              <div className="repo-card-actions">
                <Link
                  to={`/readmes?repo=${encodeURIComponent(repo.id)}`}
                  className="btn btn-secondary"
                >
                  View README
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void syncOne(repo.id)}
                  disabled={syncingAll || busyId !== null}
                >
                  {isActive ? (
                    <span className="btn-with-spinner">
                      <span className="spinner" aria-hidden />
                      Updating…
                    </span>
                  ) : (
                    "Update to main"
                  )}
                </button>
              </div>
            </article>
          );
        })}
        {repos.length === 0 && (
          <div className="card">
            <p className="muted">
              No repositories are configured. Contact an admin — the catalog is
              fixed and cannot be changed from the UI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
