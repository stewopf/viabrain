import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/src/config → repo root
const root = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(root, ".env") });
// Also allow env from the process environment / cwd .env (systemd, AWS, etc.)
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = (process.env[name] ?? fallback)?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function boolEnv(name: string): boolean | undefined {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return undefined;
}

const clientOrigin =
  process.env.CLIENT_ORIGIN?.trim() ||
  `http://localhost:${Number(process.env.PORT ?? 4000)}`;

const cookieSecureOverride = boolEnv("COOKIE_SECURE");

export const env = {
  root,
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required("MONGODB_URI", "mongodb://127.0.0.1:27017/viabrain"),
  jwtSecret: required("JWT_SECRET", "dev-only-change-me"),
  adminUsername: required("ADMIN_USERNAME", "admin"),
  adminPassword: required("ADMIN_PASSWORD", "changeme"),
  cursorApiKey: process.env.CURSOR_API_KEY?.trim() ?? "",
  /**
   * Local Cursor SDK sandbox. Not supported on many cloud hosts (e.g. AWS).
   * Default: on in dev, off in production. Override with CURSOR_SANDBOX_ENABLED.
   */
  cursorSandboxEnabled:
    boolEnv("CURSOR_SANDBOX_ENABLED") ??
    process.env.NODE_ENV !== "production",
  reposRoot: path.resolve(root, process.env.REPOS_ROOT ?? "./repos"),
  reposConfigPath: path.join(root, "config", "repos.json"),
  playbooksConfigPath: path.join(root, "config", "playbooks.json"),
  repoMapConfigPath: path.join(root, "config", "repo-map.json"),
  clientOrigin,
  /**
   * Auth cookies use Secure only for HTTPS public origins.
   * Override with COOKIE_SECURE=true|false if needed (e.g. TLS terminated at a proxy).
   */
  cookieSecure:
    cookieSecureOverride ?? clientOrigin.startsWith("https://"),
  cronSync: process.env.CRON_SYNC ?? "0 2 * * *",
  cursorHome: path.resolve(root, process.env.CURSOR_HOME ?? "./.cursor-home"),
  postLoginRedirect:
    process.env.OKTA_POST_LOGIN_REDIRECT?.trim() ||
    clientOrigin ||
    `http://localhost:${Number(process.env.PORT ?? 4000)}/`,
};
