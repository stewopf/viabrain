import cron from "node-cron";
import { env } from "../config/env.js";
import { syncAllRepos } from "./repos.js";

export function startRepoSyncCron(): void {
  if (!cron.validate(env.cronSync)) {
    console.warn(`[cron] invalid CRON_SYNC "${env.cronSync}", skipping`);
    return;
  }

  cron.schedule(env.cronSync, async () => {
    console.log("[cron] nightly repo sync starting");
    try {
      const results = await syncAllRepos();
      const failed = results.filter((r) => !r.ok);
      console.log(
        `[cron] sync finished: ${results.length - failed.length} ok, ${failed.length} failed`,
      );
      for (const f of failed) {
        console.warn(`[cron] ${f.repoId}: ${f.error}`);
      }
    } catch (err) {
      console.error("[cron] sync crashed", err);
    }
  });

  console.log(`[cron] scheduled repo sync: ${env.cronSync}`);
}
