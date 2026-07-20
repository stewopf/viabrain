import crypto from "node:crypto";
import type { Request } from "express";
import { env } from "../config/env.js";
import { requestOrigin } from "../requestOrigin.js";

export type OktaRuntimeConfig = {
  enabled: boolean;
  issuer: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string;
};

function normalizeIssuer(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return trimmed;
  if (/\/oauth2\//i.test(trimmed)) return trimmed;
  return `${trimmed}/oauth2/default`;
}

export function getOktaConfig(req?: Request): OktaRuntimeConfig {
  const orgUrl = process.env.OKTA_ORG_URL?.trim() ?? "";
  const clientId = process.env.OKTA_CLIENT_ID?.trim() ?? "";
  const enabled = Boolean(orgUrl && clientId);

  const redirectUri =
    process.env.OKTA_REDIRECT_URI?.trim() ||
    `${(req ? requestOrigin(req) : env.clientOrigin).replace(/\/$/, "")}/api/auth/okta/callback`;

  return {
    enabled,
    issuer: orgUrl ? normalizeIssuer(orgUrl) : "",
    clientId,
    clientSecret: process.env.OKTA_CLIENT_SECRET?.trim() || undefined,
    redirectUri,
    scopes: process.env.OKTA_SCOPES?.trim() || "openid profile email",
  };
}

export function createPkcePair(): {
  verifier: string;
  challenge: string;
} {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

export function createOAuthState(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function buildAuthorizeUrl(input: {
  config: OktaRuntimeConfig;
  state: string;
  nonce: string;
  challenge: string;
}): string {
  const url = new URL(`${input.config.issuer}/v1/authorize`);
  url.searchParams.set("client_id", input.config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", input.config.scopes);
  url.searchParams.set("redirect_uri", input.config.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeCodeForTokens(input: {
  config: OktaRuntimeConfig;
  code: string;
  verifier: string;
}): Promise<{
  access_token?: string;
  id_token: string;
  token_type?: string;
}> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: input.config.clientId,
    redirect_uri: input.config.redirectUri,
    code: input.code,
    code_verifier: input.verifier,
  });
  if (input.config.clientSecret) {
    body.set("client_secret", input.config.clientSecret);
  }

  const res = await fetch(`${input.config.issuer}/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Okta token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as {
    access_token?: string;
    id_token: string;
    token_type?: string;
  };
}

export function decodeIdTokenPayload(idToken: string): {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
} {
  const parts = idToken.split(".");
  if (parts.length < 2) throw new Error("Invalid id_token");
  const json = Buffer.from(parts[1]!, "base64url").toString("utf8");
  return JSON.parse(json) as {
    sub: string;
    email?: string;
    preferred_username?: string;
    name?: string;
  };
}
