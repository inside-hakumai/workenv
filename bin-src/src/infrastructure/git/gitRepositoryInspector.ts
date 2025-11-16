import { basename } from 'node:path';
import {
  BranchNotFoundError,
  GitCommandError,
  NotAGitRepositoryError,
  WorktreeConflictError,
  type WorktreeConflictDetail,
} from '../../shared/errors.js';
import { runGitCommand } from './gitCommandRunner.js';

/**
 * リポジトリ情報を表すコンテキスト
 */
export type RepositoryContext = {
  /** リポジトリルートの絶対パス */
  readonly repoRoot: string;
  /** `basename(repoRoot)`で得られるリポジトリ名 */
  readonly repoName: string;
};

/**
 * Worktree衝突検知に必要な入力
 */
export type WorktreeCollisionCheckPlan = {
  /** Gitコマンドを実行するリポジトリルート */
  readonly repoRoot: string;
  /** 生成予定のworktreeパス */
  readonly targetPath: string;
  /** 生成予定のブランチrefs（例: `refs/heads/feature/new`） */
  readonly branchRef: string;
};

/**
 * 現在のディレクトリが属するGitリポジトリのルート情報を取得する。
 *
 * @returns リポジトリルートとリポジトリ名
 * @throws NotAGitRepositoryError Git管理下でない場合
 */
export async function getRepositoryContext(): Promise<RepositoryContext> {
  try {
    const { stdout } = await runGitCommand(['rev-parse', '--show-toplevel']);
    const repoRoot = stdout.trim();
    if (repoRoot.length === 0) {
      throw new NotAGitRepositoryError('Gitリポジトリ直下でコマンドを実行してください。');
    }

    return {
      repoRoot,
      repoName: basename(repoRoot),
    };
  } catch (error: unknown) {
    if (error instanceof GitCommandError) {
      const detail = error.stderr.trim();
      const suffix = detail.length > 0 ? `\n${detail}` : '';
      throw new NotAGitRepositoryError(`Gitリポジトリ直下でコマンドを実行してください。${suffix}`);
    }

    throw error;
  }
}

/**
 * 指定ブランチがローカルに存在することを検証する。
 *
 * @param repoRoot - Gitコマンドを実行するルートディレクトリ
 * @param branchName - 利用者が指定したブランチ名
 * @throws BranchNotFoundError ブランチ不存在の場合
 */
export async function assertBranchExists(repoRoot: string, branchName: string): Promise<void> {
  const normalizedBranchRef = branchName.startsWith('refs/') ? branchName : `refs/heads/${branchName}`;
  try {
    await runGitCommand(['show-ref', '--verify', normalizedBranchRef], { cwd: repoRoot });
  } catch (error: unknown) {
    if (error instanceof GitCommandError) {
      const detail = error.stderr.trim();
      const suffix = detail.length > 0 ? `\n${detail}` : '';
      throw new BranchNotFoundError(`指定したブランチが見つかりません: ${branchName}${suffix}`);
    }

    throw error;
  }
}

/**
 * 既存worktreeにターゲットパスやブランチが衝突しないか検証する。
 *
 * @param plan - 衝突検知に必要な情報
 * @throws WorktreeConflictError 衝突が検出された場合
 */
export async function checkWorktreeCollision(plan: WorktreeCollisionCheckPlan): Promise<void> {
  const { stdout } = await runGitCommand(['worktree', 'list', '--porcelain'], { cwd: plan.repoRoot });
  const entries = parseWorktreeList(stdout);
  const conflicts: WorktreeConflictDetail[] = [];

  for (const entry of entries) {
    if (entry.path === plan.targetPath) {
      conflicts.push({
        type: 'path',
        existingPath: entry.path,
      });
    }

    if (entry.branchRef === plan.branchRef) {
      conflicts.push({
        type: 'branch',
        existingPath: entry.path,
        branchRef: entry.branchRef,
      });
    }
  }

  if (conflicts.length === 0) {
    return;
  }

  const conflictMessages = conflicts.map(detail =>
    detail.type === 'path'
      ? `- 既存worktreeパス: ${detail.existingPath}`
      : `- 既存worktreeブランチ: ${detail.branchRef} (path: ${detail.existingPath})`,
  );

  throw new WorktreeConflictError(['既存のworktreeと衝突しました。', ...conflictMessages].join('\n'), conflicts);
}

type WorktreeEntry = {
  readonly path: string;
  readonly branchRef?: string;
};

const worktreePrefix = 'worktree ';
const branchPrefix = 'branch ';

/**
 * `git worktree list --porcelain`の出力をエントリーの配列へ変換する。
 *
 * @param output - `git worktree list --porcelain`のstdout
 * @returns worktree単位の情報一覧
 */
const parseWorktreeList = (output: string): WorktreeEntry[] => {
  const entries: WorktreeEntry[] = [];
  let current: WorktreeEntry | undefined;

  for (const rawLine of output.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0) {
      if (current) {
        entries.push(current);
        current = undefined;
      }

      continue;
    }

    if (line.startsWith(worktreePrefix)) {
      if (current) {
        entries.push(current);
      }

      current = {
        path: line.slice(worktreePrefix.length).trim(),
      };
      continue;
    }

    if (line.startsWith(branchPrefix) && current) {
      current = {
        ...current,
        branchRef: line.slice(branchPrefix.length).trim(),
      };
    }
  }

  if (current) {
    entries.push(current);
  }

  return entries;
};
