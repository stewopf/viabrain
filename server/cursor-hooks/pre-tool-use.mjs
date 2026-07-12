#!/usr/bin/env node
/**
 * Deny write/edit/delete and other mutating tools for VIA Project Ask-only mode.
 * Reads JSON on stdin from Cursor hooks; writes decision JSON to stdout.
 */
import { readFileSync } from "node:fs";

const DENIED = new Set([
  "Write",
  "Edit",
  "Delete",
  "StrReplace",
  "ApplyPatch",
  "EditNotebook",
  "GenerateImage",
  "DeleteFile",
  "CreateFile",
  "MoveFile",
  "RenameFile",
  "WriteFile",
  "apply_patch",
  "search_replace",
  "write_to_file",
  "delete_file",
]);

const DENIED_PATTERN =
  /^(write|edit|delete|strreplace|apply.?patch|create.?file|move.?file|rename.?file)/i;

let input = "";
try {
  input = readFileSync(0, "utf8");
} catch {
  input = "";
}

let toolName = "";
try {
  const payload = JSON.parse(input || "{}");
  toolName =
    payload.tool_name ||
    payload.toolName ||
    payload.name ||
    payload.tool?.name ||
    "";
} catch {
  toolName = "";
}

const denied =
  DENIED.has(toolName) || (toolName.length > 0 && DENIED_PATTERN.test(toolName));

if (denied) {
  process.stdout.write(
    JSON.stringify({
      permission: "deny",
      user_message: `VIA Project is permanently Ask/read-only. Tool "${toolName}" is blocked and mode cannot be switched.`,
    }),
  );
} else {
  process.stdout.write(JSON.stringify({ permission: "allow" }));
}
