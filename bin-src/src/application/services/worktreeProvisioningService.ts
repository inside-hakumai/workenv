import type { SanitizedBranchName } from '../../domain/branchNameSanitizer.js';
import { runGitCommand } from '../../infrastructure/git/gitCommandRunner.js';
import {
  assertBranchExists,
  checkWorktreeCollision,
  getRepositoryContext,
} from '../../infrastructure/git/gitRepositoryInspector.js';
import {
  buildWorktreeTargetPath,
  ensureWorktreeBaseDir,
} from '../../infrastructure/worktree/worktreeDirectoryManager.js';

/**
 * Worktree作成要求の入力値
 */
export type WorktreeProvisioningRequest = {
  /** サニタイズ前後のブランチ情報 */
  readonly branch: SanitizedBranchName;
};

/**
 * Worktree作成完了時に返却する結果
 */
export type WorktreeProvisioningResult = {
  /** `~/.git-worktree-manager/`配下に生成されるターゲットパス */
  readonly targetPath: string;
  /** 利用者が指定したブランチ名 */
  readonly branchName: string;
  /** ファイルシステム向けのサニタイズ済みブランチ名 */
  readonly sanitizedBranchName: string;
  /** 生成されたworktreeのHEADコミットSHA */
  readonly headCommit: string;
};

/**
 * Worktree作成のオーケストレーションを行う
 *
 * @param request - ブランチ情報
 * @returns 作成結果
 */
export async function provisionWorktree(request: WorktreeProvisioningRequest): Promise<WorktreeProvisioningResult> {
  const branchName = request.branch.original;
  const branchRef = branchName.startsWith('refs/') ? branchName : `refs/heads/${branchName}`;

  const repositoryContext = await getRepositoryContext();
  await assertBranchExists(repositoryContext.repoRoot, branchName);

  await ensureWorktreeBaseDir();
  const targetPath = buildWorktreeTargetPath(repositoryContext.repoName, request.branch.sanitized);

  await checkWorktreeCollision({
    repoRoot: repositoryContext.repoRoot,
    targetPath,
    branchRef,
  });

  await runGitCommand(['worktree', 'add', targetPath, branchName], {
    cwd: repositoryContext.repoRoot,
  });

  const { stdout: headStdout } = await runGitCommand(['rev-parse', 'HEAD'], {
    cwd: targetPath,
  });
  const headCommit = headStdout.trim();

  return {
    targetPath,
    branchName,
    sanitizedBranchName: request.branch.sanitized,
    headCommit,
  };
}
