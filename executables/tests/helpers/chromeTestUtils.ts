import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const spawnedChromePids: number[] = [];
const createdUserDataDirs: string[] = [];

export const getChromeExecutablePath = (): string => {
  switch (process.platform) {
    case 'darwin':
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    case 'win32':
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    default:
      return '/usr/bin/google-chrome';
  }
};

export const createTempUserDataDir = (profileName: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `workenv-chrome-${profileName}-`));
  createdUserDataDirs.push(dir);
  return dir;
};

export const trackChromeProcess = (pid: number | undefined): void => {
  if (typeof pid === 'number') {
    spawnedChromePids.push(pid);
  }
};

export const cleanupChromeTestArtifacts = (): void => {
  for (const pid of spawnedChromePids) {
    try {
      process.kill(pid);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ESRCH') {
        throw error;
      }
    }
  }
  spawnedChromePids.length = 0;

  for (const dir of createdUserDataDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        throw error;
      }
    }
  }
  createdUserDataDirs.length = 0;
};
