import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type RepoReadme } from "../api";
import "./ReadmesPage.css";

const ALL = "__all__";

export function ReadmesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = searchParams.get("repo") || ALL;
  const [readmes, setReadmes] = useState<RepoReadme[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const list = await api.listReadmes();
        setReadmes(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load READMEs");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = useMemo(() => {
    if (selected === ALL) return readmes;
    return readmes.filter((r) => r.repoId === selected);
  }, [readmes, selected]);

  function selectRepo(id: string) {
    if (id === ALL) {
      setSearchParams({});
      return;
    }
    setSearchParams({ repo: id });
  }

  return (
    <div className="console-content wide">
      <section className="builder-hero">
        <div className="builder-hero-left">
          <p className="builder-hero-kicker">Repository docs</p>
          <h1 className="builder-hero-title">Browse README.md</h1>
          <p className="builder-hero-sub">
            Read the top-level README for any synced repo, or browse all of them
            in one scrollable view.
          </p>
        </div>
        <div className="builder-hero-actions">
          <Link to="/repos" className="builder-hero-btn ghost">
            Manage sync
            <span className="builder-hero-btn-pointer">→</span>
          </Link>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <div className="readmes-layout">
        <aside className="card readmes-nav">
          <div className="repo-picker-label">Repositories</div>
          <button
            type="button"
            className={`readme-nav-item${selected === ALL ? " active" : ""}`}
            onClick={() => selectRepo(ALL)}
          >
            Browse all
            <span className="muted">{readmes.length}</span>
          </button>
          {readmes.map((r) => (
            <button
              key={r.repoId}
              type="button"
              className={`readme-nav-item${selected === r.repoId ? " active" : ""}`}
              onClick={() => selectRepo(r.repoId)}
            >
              <span className="readme-nav-title">{r.repoId}</span>
              <span
                className={`readme-status${r.missing ? " missing" : " ok"}`}
              >
                {r.missing ? "missing" : r.filename ?? "README"}
              </span>
            </button>
          ))}
        </aside>

        <div className="readmes-content">
          {loading && <p className="muted">Loading READMEs…</p>}
          {!loading &&
            visible.map((r) => (
              <article key={r.repoId} className="card readme-card" id={r.repoId}>
                <header className="readme-card-head">
                  <div>
                    <h2>{r.repoId}</h2>
                    <p className="muted">{r.fullName}</p>
                  </div>
                  {selected === ALL && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => selectRepo(r.repoId)}
                    >
                      Open alone
                    </button>
                  )}
                </header>

                {r.error && <div className="error-banner">{r.error}</div>}
                {r.missing && !r.error && (
                  <p className="muted">
                    No README.md found in the local clone.
                  </p>
                )}
                {r.content && (
                  <div className="markdown readme-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {r.content}
                    </ReactMarkdown>
                  </div>
                )}
              </article>
            ))}
        </div>
      </div>
    </div>
  );
}
