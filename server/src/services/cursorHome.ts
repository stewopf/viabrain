import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Install read-only Cursor hooks into CURSOR_HOME so local agents
 * deny write/edit tools and mutating shell commands.
 */
export async function ensureCursorHome(): Promise<void> {
  const cursorDir = path.join(env.cursorHome, ".cursor");
  const hooksDir = path.join(cursorDir, "hooks");
  await fs.mkdir(hooksDir, { recursive: true });

  const sourceHooks = path.resolve(__dirname, "../../cursor-hooks");
  const hooksJson = await fs.readFile(path.join(sourceHooks, "hooks.json"), "utf8");

  try {
    await fs.writeFile(path.join(cursorDir, "hooks.json"), hooksJson);

    for (const file of ["pre-tool-use.mjs", "before-shell.mjs"]) {
      const content = await fs.readFile(path.join(sourceHooks, file), "utf8");
      await fs.writeFile(path.join(hooksDir, file), content, { mode: 0o755 });
    }
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? err.code : null;
    if (code === "EPERM" || code === "EACCES") {
      console.warn(
        `[hooks] could not refresh hooks in ${env.cursorHome} (${String(code)}); continuing with existing files`,
      );
    } else {
      throw err;
    }
  }

  // Local SDK agents resolve hooks from the process HOME.
  process.env.HOME = env.cursorHome;
  console.log(`[hooks] Cursor HOME set to ${env.cursorHome}`);
}
