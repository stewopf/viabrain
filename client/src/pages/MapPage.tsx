import { useEffect, useMemo, useState } from "react";
import { api, type RepoMap } from "../api";
import "./MapPage.css";

const LAYER_ORDER = [
  "admin",
  "client",
  "product",
  "api",
  "ai",
  "platform",
  "media",
  "infra",
];

export function MapPage() {
  const [map, setMap] = useState<RepoMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    void api
      .getRepoMap()
      .then(setMap)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load map"),
      );
  }, []);

  const layers = useMemo(() => {
    if (!map) return [];
    const grouped = new Map<string, RepoMap["nodes"]>();
    for (const node of map.nodes) {
      const list = grouped.get(node.layer) ?? [];
      list.push(node);
      grouped.set(node.layer, list);
    }
    return LAYER_ORDER.filter((l) => grouped.has(l)).map((l) => ({
      layer: l,
      nodes: grouped.get(l)!,
    }));
  }, [map]);

  const relatedEdges = useMemo(() => {
    if (!map || !activeId) return [];
    return map.edges.filter((e) => e.from === activeId || e.to === activeId);
  }, [map, activeId]);

  return (
    <div className="console-content">
      <section className="builder-hero">
        <div className="builder-hero-left">
          <p className="builder-hero-kicker">Cross-repo map</p>
          <h1 className="builder-hero-title">
            {map?.title ?? "VIA platform map"}
          </h1>
          <p className="builder-hero-sub">
            {map?.summary ??
              "Curated relationships across the fixed stewopf repository catalog."}
          </p>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <div className="map-layout">
        <div className="map-layers">
          {layers.map(({ layer, nodes }) => (
            <section key={layer} className="map-layer card">
              <h2>{layer}</h2>
              <div className="map-nodes">
                {nodes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`map-node${activeId === n.id ? " active" : ""}`}
                    onClick={() =>
                      setActiveId((prev) => (prev === n.id ? null : n.id))
                    }
                  >
                    <strong>{n.label}</strong>
                    <span>{n.id}</span>
                    <em>{n.role}</em>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="card map-edges">
          <h2>{activeId ? `Connections · ${activeId}` : "Connections"}</h2>
          {!activeId && (
            <p className="muted">Select a service to see related edges.</p>
          )}
          {activeId && relatedEdges.length === 0 && (
            <p className="muted">No curated edges for this node.</p>
          )}
          <ul className="edge-list">
            {relatedEdges.map((e, idx) => (
              <li key={`${e.from}-${e.to}-${idx}`}>
                <code>{e.from}</code>
                <span className="edge-arrow">→</span>
                <code>{e.to}</code>
                <span className="edge-label">{e.label}</span>
              </li>
            ))}
          </ul>
          {map && !activeId && (
            <ul className="edge-list all-edges">
              {map.edges.map((e, idx) => (
                <li key={`all-${e.from}-${e.to}-${idx}`}>
                  <code>{e.from}</code>
                  <span className="edge-arrow">→</span>
                  <code>{e.to}</code>
                  <span className="edge-label">{e.label}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
