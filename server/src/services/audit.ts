import type { Request } from "express";
import { AuditEvent } from "../models/AuditEvent.js";
import { listReposWithStatus } from "./repos.js";

export type AuditRepoSha = {
  repoId: string;
  sha: string | null;
  fullName?: string;
};

export async function snapshotRepoShas(
  repoIds?: string[],
): Promise<AuditRepoSha[]> {
  const repos = await listReposWithStatus();
  const filtered = repoIds?.length
    ? repos.filter((r) => repoIds.includes(r.id))
    : repos;
  return filtered.map((r) => ({
    repoId: r.id,
    sha: r.sha,
    fullName: r.fullName,
  }));
}

export async function writeAudit(input: {
  req?: Request;
  userId?: string;
  username: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  detail?: unknown;
  repoIds?: string[];
  repoShas?: AuditRepoSha[];
}): Promise<void> {
  try {
    const repoShas =
      input.repoShas ?? (await snapshotRepoShas(input.repoIds));
    await AuditEvent.create({
      userId: input.userId,
      username: input.username,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      detail: input.detail,
      repoShas,
      ip: input.req?.ip,
    });
  } catch (err) {
    console.error("[audit] failed to write event", err);
  }
}
