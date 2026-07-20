import type { Request } from "express";
import { env } from "./config/env.js";

/** Public origin for the incoming request (respects reverse-proxy headers). */
export function requestOrigin(req: Request): string {
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)
      ?.split(",")[0]
      ?.trim() ||
    (req.secure ? "https" : "http");

  const host =
    (req.headers["x-forwarded-host"] as string | undefined)
      ?.split(",")[0]
      ?.trim() ||
    req.get("host") ||
    new URL(env.clientOrigin).host;

  return `${proto}://${host}`;
}

/** Whether auth cookies for this request should be Secure. */
export function cookieSecureForRequest(req: Request): boolean {
  if (env.cookieSecureOverride !== undefined) {
    return env.cookieSecureOverride;
  }
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)
      ?.split(",")[0]
      ?.trim() ||
    (req.secure ? "https" : "http");
  return proto === "https";
}

export function postLoginRedirectFor(req: Request): string {
  const configured = process.env.OKTA_POST_LOGIN_REDIRECT?.trim();
  if (configured) return configured;
  return `${requestOrigin(req).replace(/\/$/, "")}/`;
}
