#!/usr/bin/env node
/**
 * Block mutating shell commands for VIA Project Ask/read-only mode.
 */
import { readFileSync } from "node:fs";

const BLOCK =
  /\b(rm\b|mv\b|cp\b|mkdir\b|touch\b|chmod\b|chown\b|tee\b|dd\b|truncate\b|git\s+(add|commit|push|reset|checkout|merge|rebase|cherry-pick|stash|clean|am|revert)|npm\s+(i|install|uninstall|update|ci)\b|pnpm\s+(add|i|install|remove|update)\b|yarn\s+(add|remove|upgrade)\b|pip\s+install\b|npx\s+[^\n]*\b--|python[23]?\s+-c\s+.*open\(|>\s*|>>\s*|sed\s+-i\b|perl\s+-i\b|ruby\s+-i\b)/i;

let input = "";
try {
  input = readFileSync(0, "utf8");
} catch {
  input = "";
}

let command = "";
try {
  const payload = JSON.parse(input || "{}");
  command = payload.command || payload.shell_command || payload.cmd || "";
} catch {
  command = "";
}

if (BLOCK.test(command)) {
  process.stdout.write(
    JSON.stringify({
      permission: "deny",
      user_message:
        "VIA Project is permanently Ask/read-only. Mutating shell commands are blocked and mode cannot be switched.",
    }),
  );
} else {
  process.stdout.write(JSON.stringify({ permission: "allow" }));
}
