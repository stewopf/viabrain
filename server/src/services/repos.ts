import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { env } from "../config/env.js";
import { RepoSync } from "../models/RepoSync.js";

const execFileAsync = promisify(execFile);

export type RepoConfig = {
  id: string;
  fullName: string;
  defaultBranch: string;
};

export async function loadRepoRegistry(): Promise<RepoConfig[]> {
  const raw = await fs.readFile(env.reposConfigPath, "utf8");
  const parsed = JSON.parse(raw) as Array<{
    id: string;
    fullName: string;
    defaultBranch?: string;
  }>;
  return parsed.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    defaultBranch: r.defaultBranch ?? "main",
  }));
}

export function repoPath(repoId: string): string {
  return path.join(env.reposRoot, repoId);
}

async function runGh(args: string[], cwd?: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync("gh", args, {
    cwd,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });
  return (stdout || stderr || "").toString().trim();
}

async function ensureReposRoot(): Promise<void> {
  await fs.mkdir(env.reposRoot, { recursive: true });
}

async function getRemoteSha(
  fullName: string,
  branch: string,
): Promise<string> {
  return runGh([
    "api",
    `repos/${fullName}/commits/${branch}`,
    "--jq",
    ".sha",
  ]);
}

async function cloneExists(dest: string): Promise<boolean> {
  try {
    await fs.access(path.join(dest, ".git"));
    return true;
  } catch {
    return false;
  }
}

export async function syncRepo(repo: RepoConfig): Promise<{
  repoId: string;
  branch: string;
  sha: string;
  syncedAt: Date;
}> {
  await ensureReposRoot();
  const dest = repoPath(repo.id);
  const branch = repo.defaultBranch;

  await RepoSync.findOneAndUpdate(
    { repoId: repo.id },
    {
      repoId: repo.id,
      fullName: repo.fullName,
      branch,
      status: "syncing",
      lastError: null,
    },
    { upsert: true },
  );

  try {
    if (!(await cloneExists(dest))) {
      await fs.rm(dest, { recursive: true, force: true });
      await runGh([
        "repo",
        "clone",
        repo.fullName,
        dest,
        "--",
        "--branch",
        branch,
      ]);
    } else {
      // Hard-reset local clone to match remote branch via gh only.
      await runGh(
        [
          "repo",
          "sync",
          "--source",
          repo.fullName,
          "--branch",
          branch,
          "--force",
        ],
        dest,
      );
    }

    const sha = await getRemoteSha(repo.fullName, branch);
    const syncedAt = new Date();

    await RepoSync.findOneAndUpdate(
      { repoId: repo.id },
      {
        sha,
        syncedAt,
        status: "ok",
        lastError: null,
        branch,
        fullName: repo.fullName,
      },
    );

    return { repoId: repo.id, branch, sha, syncedAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await RepoSync.findOneAndUpdate(
      { repoId: repo.id },
      { status: "error", lastError: message },
    );
    throw err;
  }
}

export async function syncAllRepos(): Promise<
  Array<{ repoId: string; ok: boolean; error?: string; sha?: string }>
> {
  const registry = await loadRepoRegistry();
  const results = [];
  for (const repo of registry) {
    try {
      const result = await syncRepo(repo);
      results.push({ repoId: repo.id, ok: true, sha: result.sha });
    } catch (err) {
      results.push({
        repoId: repo.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}

export async function listReposWithStatus() {
  const registry = await loadRepoRegistry();
  const statuses = await RepoSync.find({
    repoId: { $in: registry.map((r) => r.id) },
  }).lean();
  const byId = new Map(statuses.map((s) => [s.repoId, s]));

  return registry.map((repo) => {
    const status = byId.get(repo.id);
    return {
      id: repo.id,
      fullName: repo.fullName,
      defaultBranch: repo.defaultBranch,
      branch: status?.branch ?? repo.defaultBranch,
      sha: status?.sha ?? null,
      syncedAt: status?.syncedAt ?? null,
      status: status?.status ?? "never",
      lastError: status?.lastError ?? null,
      path: repoPath(repo.id),
    };
  });
}
