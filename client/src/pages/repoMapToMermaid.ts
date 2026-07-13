import type { RepoMap } from "../api";

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

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

function quoteLabel(label: string): string {
  return `"${label.replace(/"/g, "'")}"`;
}

/** Build a Mermaid flowchart from the curated repo map. */
export function repoMapToMermaid(
  map: RepoMap,
  activeId: string | null = null,
): string {
  const related = new Set<string>();
  if (activeId) {
    related.add(activeId);
    for (const edge of map.edges) {
      if (edge.from === activeId || edge.to === activeId) {
        related.add(edge.from);
        related.add(edge.to);
      }
    }
  }

  const nodes = activeId
    ? map.nodes.filter((n) => related.has(n.id))
    : map.nodes;
  const edges = activeId
    ? map.edges.filter((e) => e.from === activeId || e.to === activeId)
    : map.edges;

  const byLayer = new Map<string, typeof nodes>();
  for (const node of nodes) {
    const list = byLayer.get(node.layer) ?? [];
    list.push(node);
    byLayer.set(node.layer, list);
  }

  const orderedLayers = [
    ...LAYER_ORDER.filter((l) => byLayer.has(l)),
    ...[...byLayer.keys()].filter((l) => !LAYER_ORDER.includes(l)),
  ];

  const lines: string[] = ["flowchart TB"];

  for (const layer of orderedLayers) {
    const layerNodes = byLayer.get(layer)!;
    const subgraphId = `layer_${safeId(layer)}`;
    lines.push(`  subgraph ${subgraphId}[${quoteLabel(layer)}]`);
    for (const node of layerNodes) {
      const id = safeId(node.id);
      const className = node.id === activeId ? ":::active" : "";
      lines.push(`    ${id}[${quoteLabel(node.label)}]${className}`);
    }
    lines.push("  end");
  }

  for (const edge of edges) {
    const from = safeId(edge.from);
    const to = safeId(edge.to);
    lines.push(`  ${from} -->|${quoteLabel(edge.label)}| ${to}`);
  }

  lines.push("  classDef active stroke:#013572,stroke-width:3px,fill:#e8f1fb");

  return lines.join("\n");
}
