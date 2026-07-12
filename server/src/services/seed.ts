import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { env } from "../config/env.js";

export async function seedAdminUser(): Promise<void> {
  const existing = await User.findOne({ username: env.adminUsername });
  if (existing) {
    return;
  }
  const passwordHash = await bcrypt.hash(env.adminPassword, 12);
  await User.create({
    username: env.adminUsername,
    passwordHash,
  });
  console.log(`[auth] seeded admin user "${env.adminUsername}"`);
}
