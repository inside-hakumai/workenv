/**
 * ブラウザプロファイルに関するドメイン型と検証ロジック
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  PROFILE_NAME_REGEX,
  PROFILE_NAME_MAX_LENGTH,
  PROFILE_ROOT_DIR,
  SESSION_LOCK_FILE,
} from '../shared/constants.js';
import { ConfigurationError } from '../shared/errors.js';

/**
 * ブラウザプロファイル
 */
export type BrowserProfile = {
  /** プロファイル名（小文字英数字と `-` / `_` のみ） */
  profileName: string;
  /** プロファイルデータディレクトリの絶対パス */
  dataDirectory: string;
  /** セッションロックファイルの絶対パス */
  lockFilePath: string;
  /** プロファイル作成日時 */
  createdAt: Date | null;
  /** 最終起動日時 */
  lastLaunchedAt: Date | null;
  /** Chromeバージョン（オプション） */
  chromeVersion?: string;
};

/**
 * プロファイル名のバリデーション結果
 */
export type ProfileNameValidationResult = { valid: true } | { valid: false; reason: string };

/**
 * プロファイル名を検証する
 *
 * @param profileName - 検証対象のプロファイル名
 * @returns バリデーション結果
 */
export function validateBrowserProfileName(profileName: string): ProfileNameValidationResult {
  if (profileName.length === 0) {
    return { valid: false, reason: 'プロファイル名は空にできません' };
  }

  if (profileName.length > PROFILE_NAME_MAX_LENGTH) {
    return {
      valid: false,
      reason: `プロファイル名は${PROFILE_NAME_MAX_LENGTH}文字以下である必要があります`,
    };
  }

  if (!PROFILE_NAME_REGEX.test(profileName)) {
    return {
      valid: false,
      reason: 'プロファイル名は小文字英数字、ハイフン(-)、アンダースコア(_)のみ使用できます',
    };
  }

  return { valid: true };
}

/**
 * プロファイル名から各種パスを解決する
 *
 * @param profileName - プロファイル名
 * @returns プロファイルパス情報
 * @throws {ConfigurationError} プロファイル名が無効な場合
 */
export function resolveProfilePaths(profileName: string): {
  dataDirectory: string;
  lockFilePath: string;
} {
  const validation = validateBrowserProfileName(profileName);
  if (!validation.valid) {
    throw new ConfigurationError(`無効なプロファイル名: ${validation.reason}`);
  }

  const dataDirectory = join(homedir(), PROFILE_ROOT_DIR, profileName);
  const lockFilePath = join(dataDirectory, SESSION_LOCK_FILE);

  return {
    dataDirectory,
    lockFilePath,
  };
}
