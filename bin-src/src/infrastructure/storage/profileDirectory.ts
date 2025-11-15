/**
 * プロファイルディレクトリ確保ユーティリティ
 */

import { access, mkdir, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { resolveProfilePaths } from '../../domain/browserProfile.js';
import { ensureUserDataRoot } from '../../shared/fs/userDataRoot.js';
import { ConfigurationError } from '../../shared/errors.js';

/**
 * プロファイルディレクトリの状態
 */
export type ProfileDirectoryState = {
  /** プロファイルデータディレクトリの絶対パス */
  dataDirectory: string;
  /** セッションロックファイルの絶対パス */
  lockFilePath: string;
  /** ロックファイルが存在するかどうか */
  locked: boolean;
};

/**
 * プロファイルディレクトリを作成し、書き込み権限とロック状態を検証する
 *
 * @param profileName - プロファイル名
 * @returns プロファイルディレクトリの状態
 * @throws {ConfigurationError} ディレクトリ作成や権限確認に失敗した場合
 */
export async function ensureProfileDirectory(profileName: string): Promise<ProfileDirectoryState> {
  const { dataDirectory, lockFilePath } = resolveProfilePaths(profileName);

  await ensureUserDataRoot();

  try {
    await mkdir(dataDirectory, { recursive: true });
  } catch (error) {
    throw new ConfigurationError(
      `プロファイルディレクトリを作成できませんでした: ${dataDirectory}\n${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    const stats = await stat(dataDirectory);
    if (!stats.isDirectory()) {
      throw new ConfigurationError(`プロファイルディレクトリがディレクトリではありません: ${dataDirectory}`);
    }
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }

    throw new ConfigurationError(
      `プロファイルディレクトリの状態を確認できませんでした: ${dataDirectory}\n${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    await access(dataDirectory, fsConstants.W_OK);
  } catch (error) {
    throw new ConfigurationError(
      `プロファイルディレクトリに書き込み権限がありません: ${dataDirectory}\n${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const locked = await detectLockFile(lockFilePath);

  return {
    dataDirectory,
    lockFilePath,
    locked,
  };
}

/**
 * ロックファイルの存在を確認する
 *
 * @param lockFilePath - ロックファイルのパス
 * @returns ロックファイルが存在する場合はtrue
 */
async function detectLockFile(lockFilePath: string): Promise<boolean> {
  try {
    await access(lockFilePath, fsConstants.F_OK);
    return true;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return false;
    }

    // ロックファイルへアクセスできない場合は保守的にロックとみなす
    return true;
  }
}
