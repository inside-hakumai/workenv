/**
 * ユーザーデータルートディレクトリ管理機能
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, access, constants as fsConstants } from 'node:fs/promises';
import { PROFILE_ROOT_DIR } from '../constants.js';
import { ConfigurationError } from '../errors.js';

/**
 * ユーザーデータルートディレクトリの絶対パスを取得する
 *
 * @returns ~/.ih-dopen の絶対パス
 */
export function getUserDataRoot(): string {
  return join(homedir(), PROFILE_ROOT_DIR);
}

/**
 * ディレクトリが書き込み可能かを確認する
 *
 * @param dirPath - 確認対象のディレクトリパス
 * @returns 書き込み可能な場合はtrue
 */
async function isWritable(dirPath: string): Promise<boolean> {
  try {
    await access(dirPath, fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * ユーザーデータルートディレクトリを確保する
 *
 * ディレクトリが存在しない場合は作成し、
 * 書き込み権限があることを確認する
 *
 * @returns 作成または確認されたルートディレクトリのパス
 * @throws {ConfigurationError} ディレクトリの作成または権限チェックに失敗した場合
 */
export async function ensureUserDataRoot(): Promise<string> {
  const rootPath = getUserDataRoot();

  try {
    // ディレクトリを作成（既に存在する場合は何もしない）
    await mkdir(rootPath, { recursive: true });
  } catch (error) {
    throw new ConfigurationError(
      `ユーザーデータルートディレクトリを作成できませんでした: ${rootPath}\n${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // 書き込み権限を確認
  const writable = await isWritable(rootPath);
  if (!writable) {
    throw new ConfigurationError(`ユーザーデータルートディレクトリに書き込み権限がありません: ${rootPath}`);
  }

  return rootPath;
}

/**
 * プロファイル配下の相対パスを絶対パスに解決する
 *
 * @param profileName - プロファイル名
 * @param relativePath - プロファイルディレクトリ配下の相対パス
 * @returns 絶対パス
 */
export function resolveProfilePath(profileName: string, relativePath: string): string {
  const rootPath = getUserDataRoot();
  return join(rootPath, profileName, relativePath);
}
