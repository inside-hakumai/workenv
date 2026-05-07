import os from "node:os";
import path from "node:path";
import { REPO_ROOT } from "./mapping.js";

const HOME = os.homedir();

export function shortPath(fullPath: string): string {
  const relToRepo = path.relative(REPO_ROOT, fullPath);
  if (!relToRepo.startsWith("..")) return relToRepo;

  if (fullPath.startsWith(HOME)) return "~" + fullPath.slice(HOME.length);

  return fullPath;
}
