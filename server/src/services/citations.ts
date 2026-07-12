export type Citation = {
  repoId?: string;
  path: string;
  raw: string;
};

const PATH_RE =
  /(?:^|[\s(`"'[])((?:[a-zA-Z0-9_.-]+\/)+[a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+)(?::(\d+))?/gm;

const KNOWN_EXTS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "json",
  "md",
  "yml",
  "yaml",
  "toml",
  "css",
  "scss",
  "html",
  "sql",
  "sh",
  "env",
  "dockerfile",
  "tf",
  "py",
  "go",
  "rs",
  "java",
  "kt",
  "swift",
  "rb",
  "php",
  "xml",
  "svg",
  "handlebars",
  "hbs",
]);

/**
 * Extract file-path citations from assistant markdown for the evidence trail.
 */
export function extractCitations(
  content: string,
  repoIds: string[] = [],
): Citation[] {
  const found = new Map<string, Citation>();
  const repoSet = new Set(repoIds);

  let match: RegExpExecArray | null;
  PATH_RE.lastIndex = 0;
  while ((match = PATH_RE.exec(content)) !== null) {
    const rawPath = match[1]!;
    const parts = rawPath.split("/");
    const ext = parts[parts.length - 1]!.split(".").pop()?.toLowerCase() ?? "";
    if (!KNOWN_EXTS.has(ext) && ext !== "dockerfile") continue;
    if (parts.some((p) => p === ".." || p === ".")) continue;

    let repoId: string | undefined;
    let path = rawPath;
    if (repoSet.has(parts[0]!)) {
      repoId = parts[0];
      path = parts.slice(1).join("/") || rawPath;
    }

    const key = `${repoId ?? ""}:${path}`;
    if (!found.has(key)) {
      found.set(key, {
        repoId,
        path,
        raw: match[2] ? `${rawPath}:${match[2]}` : rawPath,
      });
    }
  }

  return [...found.values()].slice(0, 50);
}
