import fs from "node:fs/promises";
import path from "node:path";
import type { LinkState } from "./types.js";

async function findAvailableBackupPath(target: string): Promise<string> {
  let candidate = `${target}.bak`;
  let i = 1;
  while (true) {
    try {
      await fs.lstat(candidate);
      candidate = `${target}.bak.${i++}`;
    } catch {
      return candidate;
    }
  }
}

export async function fixLink(state: LinkState): Promise<string | undefined> {
  const { entry } = state;

  await fs.mkdir(path.dirname(entry.target), { recursive: true });

  let backedUp: string | undefined;
  try {
    await fs.lstat(entry.target);
    backedUp = await findAvailableBackupPath(entry.target);
    await fs.rename(entry.target, backedUp);
  } catch {
    // target doesn't exist
  }

  await fs.symlink(entry.source, entry.target);
  return backedUp;
}
