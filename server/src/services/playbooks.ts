import { promises as fs } from "node:fs";
import { env } from "../config/env.js";

export type Playbook = {
  id: string;
  title: string;
  category: string;
  description: string;
  prompt: string;
};

export async function loadPlaybooks(): Promise<Playbook[]> {
  const raw = await fs.readFile(env.playbooksConfigPath, "utf8");
  return JSON.parse(raw) as Playbook[];
}
