import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// server/src/config → repo root
const root = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(root, ".env") });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  root,
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required("MONGODB_URI", "mongodb://127.0.0.1:27017/viabrain"),
  jwtSecret: required("JWT_SECRET", "dev-only-change-me"),
  adminUsername: required("ADMIN_USERNAME", "admin"),
  adminPassword: required("ADMIN_PASSWORD", "changeme"),
  cursorApiKey: process.env.CURSOR_API_KEY ?? "",
  reposRoot: path.resolve(root, process.env.REPOS_ROOT ?? "./repos"),
  reposConfigPath: path.join(root, "config", "repos.json"),
  playbooksConfigPath: path.join(root, "config", "playbooks.json"),
  repoMapConfigPath: path.join(root, "config", "repo-map.json"),
  clientOrigin:
    process.env.CLIENT_ORIGIN ??
    `http://localhost:${Number(process.env.PORT ?? 4000)}`,
  cronSync: process.env.CRON_SYNC ?? "0 2 * * *",
  cursorHome: path.resolve(root, process.env.CURSOR_HOME ?? "./.cursor-home"),
  postLoginRedirect:
    process.env.OKTA_POST_LOGIN_REDIRECT?.trim() ||
    process.env.CLIENT_ORIGIN ||
    `http://localhost:${Number(process.env.PORT ?? 4000)}/`,
};
