import fs from "node:fs/promises";
import path from "node:path";
import type { LinkEntry, LinkState } from "./types.js";

export async function checkLink(entry: LinkEntry): Promise<LinkState> {
  let stat: Awaited<ReturnType<typeof fs.lstat>>;
  try {
    stat = await fs.lstat(entry.target);
  } catch {
    return { entry, status: "missing" };
  }

  if (!stat.isSymbolicLink()) {
    return { entry, status: "conflict-file" };
  }

  const rawTarget = await fs.readlink(entry.target);
  const resolved = path.resolve(path.dirname(entry.target), rawTarget);
  if (resolved === entry.source) {
    return { entry, status: "ok" };
  }

  return { entry, status: "conflict-symlink", actualTarget: resolved };
}

export async function checkAll(
  linkEntries: LinkEntry[],
): Promise<LinkState[]> {
  return Promise.all(linkEntries.map(checkLink));
}
