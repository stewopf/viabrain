import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import {
  clearAuthCookie,
  optionalAuth,
  requireAuth,
  setAuthCookie,
  signToken,
} from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";
import { env } from "../config/env.js";
import {
  buildAuthorizeUrl,
  createOAuthState,
  createPkcePair,
  decodeIdTokenPayload,
  exchangeCodeForTokens,
  getOktaConfig,
} from "../services/okta.js";

export const authRouter = Router();

const OKTA_STATE_COOKIE = "viabrain_okta_state";
const OKTA_VERIFIER_COOKIE = "viabrain_okta_verifier";
const OKTA_NONCE_COOKIE = "viabrain_okta_nonce";

function oauthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
    path: "/",
  };
}

authRouter.get("/config", (_req, res) => {
  const okta = getOktaConfig();
  res.json({
    basicAuth: true,
    oktaEnabled: okta.enabled,
  });
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid credentials payload" });
    return;
  }

  const { username, password } = parsed.data;
  const user = await User.findOne({ username });
  if (!user) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = signToken({ id: user._id.toString(), username: user.username });
  setAuthCookie(res, token);
  await writeAudit({
    req,
    userId: user._id.toString(),
    username: user.username,
    action: "auth.login.basic",
  });
  res.json({ id: user._id.toString(), username: user.username });
});

authRouter.post("/logout", optionalAuth, async (req, res) => {
  if (req.user) {
    await writeAudit({
      req,
      userId: req.user.id,
      username: req.user.username,
      action: "auth.logout",
    });
  }
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ id: req.user!.id, username: req.user!.username });
});

authRouter.get("/okta/start", (req, res) => {
  const config = getOktaConfig();
  if (!config.enabled) {
    res.status(503).json({
      error: "Okta SSO is not configured. Set OKTA_ORG_URL and OKTA_CLIENT_ID.",
    });
    return;
  }

  const state = createOAuthState();
  const nonce = createOAuthState();
  const { verifier, challenge } = createPkcePair();
  const opts = oauthCookieOptions();

  res.cookie(OKTA_STATE_COOKIE, state, opts);
  res.cookie(OKTA_VERIFIER_COOKIE, verifier, opts);
  res.cookie(OKTA_NONCE_COOKIE, nonce, opts);

  const url = buildAuthorizeUrl({ config, state, nonce, challenge });
  res.redirect(url);
});

authRouter.get("/okta/callback", async (req, res) => {
  const config = getOktaConfig();
  if (!config.enabled) {
    res.status(503).send("Okta SSO is not configured");
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const error = typeof req.query.error === "string" ? req.query.error : "";

  if (error) {
    res.redirect(
      `${env.clientOrigin}/login?error=${encodeURIComponent(error)}`,
    );
    return;
  }

  const expectedState = req.cookies?.[OKTA_STATE_COOKIE] as string | undefined;
  const verifier = req.cookies?.[OKTA_VERIFIER_COOKIE] as string | undefined;

  res.clearCookie(OKTA_STATE_COOKIE, { path: "/" });
  res.clearCookie(OKTA_VERIFIER_COOKIE, { path: "/" });
  res.clearCookie(OKTA_NONCE_COOKIE, { path: "/" });

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    res.redirect(`${env.clientOrigin}/login?error=invalid_oauth_state`);
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens({ config, code, verifier });
    const claims = decodeIdTokenPayload(tokens.id_token);
    const username =
      claims.email ||
      claims.preferred_username ||
      claims.name ||
      `okta-${claims.sub.slice(0, 8)}`;

    let user = await User.findOne({ oktaSub: claims.sub });
    if (!user) {
      user = await User.findOne({ username });
    }
    if (!user) {
      user = await User.create({
        username,
        passwordHash: await bcrypt.hash(cryptoRandomPassword(), 12),
        oktaSub: claims.sub,
      });
    } else if (!user.oktaSub) {
      user.oktaSub = claims.sub;
      await user.save();
    }

    const token = signToken({
      id: user._id.toString(),
      username: user.username,
    });
    setAuthCookie(res, token);
    await writeAudit({
      req,
      userId: user._id.toString(),
      username: user.username,
      action: "auth.login.okta",
      detail: { sub: claims.sub },
    });

    res.redirect(env.postLoginRedirect);
  } catch (err) {
    console.error("[okta] callback failed", err);
    res.redirect(`${env.clientOrigin}/login?error=okta_callback_failed`);
  }
});

function cryptoRandomPassword(): string {
  return `okta-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
