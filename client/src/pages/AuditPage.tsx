import { useEffect, useState } from "react";
import { api, type AuditItem } from "../api";
import "./AuditPage.css";

function shortSha(sha?: string | null) {
  return sha ? sha.slice(0, 7) : "—";
}

export function AuditPage() {
  const [events, setEvents] = useState<AuditItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .listAudit(150)
      .then(setEvents)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load audit"),
      );
  }, []);

  return (
    <div className="console-content">
      <section className="builder-hero">
        <div className="builder-hero-left">
          <p className="builder-hero-kicker">Audit trail</p>
          <h1 className="builder-hero-title">Who asked what, on which SHAs</h1>
          <p className="builder-hero-sub">
            Your login, chat, export, and sync activity with repository SHA
            snapshots for diligence evidence.
          </p>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <div className="card audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Resource</th>
              <th>SHAs</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.createdAt).toLocaleString()}</td>
                <td>
                  <code>{e.action}</code>
                </td>
                <td>
                  {e.resourceType
                    ? `${e.resourceType}${e.resourceId ? `:${e.resourceId.slice(0, 8)}` : ""}`
                    : "—"}
                </td>
                <td>
                  {e.repoShas?.length ? (
                    <div className="sha-chips">
                      {e.repoShas.slice(0, 6).map((r) => (
                        <span key={r.repoId} className="sha-chip">
                          {r.repoId}@{shortSha(r.sha)}
                        </span>
                      ))}
                      {e.repoShas.length > 6 && (
                        <span className="muted">+{e.repoShas.length - 6}</span>
                      )}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
