import { ConfigurationError } from '../shared/errors.js';

/**
 * サニタイズ前後のブランチ名を保持する値オブジェクト
 */
export type SanitizedBranchName = {
  /** サニタイズ前のブランチ名 */
  readonly original: string;
  /** ファイルシステムで安全に利用できるブランチ名 */
  readonly sanitized: string;
};

const invalidCharactersPattern = /[^\w.-]+/g;
const repeatedUnderscorePattern = /_+/g;
const alphanumericPattern = /[A-Za-z\d]/;

/**
 * ブランチ名からファイルシステムで使用できない文字を置換し、値オブジェクトとして返す
 *
 * @param branchName - CLIで指定されたブランチ名
 * @returns サニタイズ済みブランチ名
 * @throws ConfigurationError サニタイズ後に安全な文字が残らない場合
 */
export function sanitizeBranchName(branchName: string): SanitizedBranchName {
  const sanitized = branchName.replaceAll(invalidCharactersPattern, '_').replaceAll(repeatedUnderscorePattern, '_');

  if (sanitized.length === 0 || !alphanumericPattern.test(sanitized)) {
    throw new ConfigurationError('ブランチ名を安全な文字列へ変換できませんでした。');
  }

  return {
    original: branchName,
    sanitized,
  };
}
