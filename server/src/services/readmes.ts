import { promises as fs } from "node:fs";
import path from "node:path";
import { loadRepoRegistry, repoPath } from "./repos.js";

const README_CANDIDATES = [
  "README.md",
  "Readme.md",
  "readme.md",
  "README.MD",
];

export type RepoReadme = {
  repoId: string;
  fullName: string;
  filename: string | null;
  content: string | null;
  missing: boolean;
  error: string | null;
};

async function readFirstReadme(
  dest: string,
): Promise<{ filename: string; content: string } | null> {
  for (const name of README_CANDIDATES) {
    const filePath = path.join(dest, name);
    try {
      const content = await fs.readFile(filePath, "utf8");
      return { filename: name, content };
    } catch {
      // try next
    }
  }
  return null;
}

export async function getRepoReadme(repoId: string): Promise<RepoReadme | null> {
  const registry = await loadRepoRegistry();
  const repo = registry.find((r) => r.id === repoId);
  if (!repo) return null;

  const dest = repoPath(repo.id);
  try {
    await fs.access(dest);
  } catch {
    return {
      repoId: repo.id,
      fullName: repo.fullName,
      filename: null,
      content: null,
      missing: true,
      error: "Repository is not cloned locally. Sync it first.",
    };
  }

  try {
    const found = await readFirstReadme(dest);
    if (!found) {
      return {
        repoId: repo.id,
        fullName: repo.fullName,
        filename: null,
        content: null,
        missing: true,
        error: null,
      };
    }
    return {
      repoId: repo.id,
      fullName: repo.fullName,
      filename: found.filename,
      content: found.content,
      missing: false,
      error: null,
    };
  } catch (err) {
    return {
      repoId: repo.id,
      fullName: repo.fullName,
      filename: null,
      content: null,
      missing: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getAllRepoReadmes(): Promise<RepoReadme[]> {
  const registry = await loadRepoRegistry();
  const results: RepoReadme[] = [];
  for (const repo of registry) {
    const readme = await getRepoReadme(repo.id);
    if (readme) results.push(readme);
  }
  return results;
}
