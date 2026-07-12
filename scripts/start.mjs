import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverEntry = path.join(root, "server", "dist", "index.js");
const clientIndex = path.join(root, "client", "dist", "index.html");

const missing = [];
if (!existsSync(serverEntry)) missing.push("server/dist (run server build)");
if (!existsSync(clientIndex)) missing.push("client/dist (run client build)");

if (missing.length > 0) {
  console.error("[via-project] Production build output is missing:");
  for (const item of missing) console.error(`  - ${item}`);
  console.error("\nRun this first:\n  npm run build\n");
  process.exit(1);
}

process.env.NODE_ENV = "production";

const child = spawn(process.execPath, [serverEntry], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
