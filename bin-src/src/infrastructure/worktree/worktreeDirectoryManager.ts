import { homedir } from 'node:os';
import { join } from 'node:path';
import { access, mkdir, constants as fsConstants } from 'node:fs/promises';
import { ConfigurationError } from '../../shared/errors.js';

const worktreeDirectoryName = '.git-worktree-manager';
const invalidCharactersPattern = /[^\w.-]+/g;
const repeatedUnderscorePattern = /_+/g;
const alphanumericPattern = /[A-Za-z\d]/;

/**
 * Worktreeベースディレクトリの絶対パスを取得する。
 *
 * @returns ホームディレクトリ配下の`.git-worktree-manager`
 */
export function getWorktreeBaseDir(): string {
  return join(homedir(), worktreeDirectoryName);
}

/**
 * Worktreeベースディレクトリを作成し、書き込み可能であることを保証する。
 *
 * @returns 利用可能になったベースディレクトリのパス
 * @throws ConfigurationError ディレクトリの作成または権限確認に失敗した場合
 */
export async function ensureWorktreeBaseDir(): Promise<string> {
  const baseDir = getWorktreeBaseDir();

  try {
    await mkdir(baseDir, { recursive: true });
  } catch (error) {
    throw new ConfigurationError(
      `worktreeベースディレクトリを作成できませんでした: ${baseDir}\n${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    await access(baseDir, fsConstants.W_OK);
  } catch (error) {
    throw new ConfigurationError(
      `worktreeベースディレクトリに書き込みできません: ${baseDir}\n${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return baseDir;
}

/**
 * リポジトリ名からファイルシステムで安全なセグメントを生成する。
 *
 * @param repoName - `basename`したリポジトリ名
 * @returns サニタイズ済みのリポジトリ名
 * @throws ConfigurationError 安全な文字列へ変換できない場合
 */
function sanitizeRepositoryName(repoName: string): string {
  const sanitized = repoName.replaceAll(invalidCharactersPattern, '_').replaceAll(repeatedUnderscorePattern, '_');

  if (sanitized.length === 0 || !alphanumericPattern.test(sanitized)) {
    throw new ConfigurationError('リポジトリ名を安全なディレクトリ名へ変換できませんでした。');
  }

  return sanitized;
}

/**
 * リポジトリ名とサニタイズ済みブランチ名からworktreeターゲットパスを構築する。
 *
 * @param repoName - 物理リポジトリの名称
 * @param sanitizedBranchName - ブランチ名のサニタイズ済み文字列
 * @returns `~/.git-worktree-manager/<repo>_<branch>`形式のパス
 * @throws ConfigurationError 入力値から安全なディレクトリ名を構築できない場合
 */
export function buildWorktreeTargetPath(repoName: string, sanitizedBranchName: string): string {
  if (sanitizedBranchName.length === 0 || !alphanumericPattern.test(sanitizedBranchName)) {
    throw new ConfigurationError('ブランチ名のサニタイズ結果が無効です。');
  }

  const sanitizedRepoName = sanitizeRepositoryName(repoName);
  const directoryName = `${sanitizedRepoName}_${sanitizedBranchName}`;

  return join(getWorktreeBaseDir(), directoryName);
}
