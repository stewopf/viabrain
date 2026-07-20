import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AuthUser = {
  id: string;
  username: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const COOKIE_NAME = "viabrain_token";

export function signToken(user: AuthUser): string {
  return jwt.sign(user, env.jwtSecret, { expiresIn: "7d" });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.cookieSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    path: "/",
    sameSite: "lax",
    secure: env.cookieSecure,
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthUser;
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (token) {
    try {
      const payload = jwt.verify(token, env.jwtSecret) as AuthUser;
      req.user = { id: payload.id, username: payload.username };
    } catch {
      // ignore invalid token on optional auth
    }
  }
  next();
}

export { COOKIE_NAME };
