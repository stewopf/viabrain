import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  path.join(root, "server", "dist", "index.js"),
  path.join(root, "client", "dist", "index.html"),
];

const missing = required.filter((p) => !existsSync(p));
if (missing.length > 0) {
  console.error("[via-project] Build did not produce required outputs:");
  for (const p of missing) console.error(`  - ${path.relative(root, p)}`);
  process.exit(1);
}

console.log("[via-project] build ok — client/dist + server/dist ready");
