import { provisionWorktree } from '../application/services/worktreeProvisioningService.js';
import { sanitizeBranchName } from '../domain/branchNameSanitizer.js';

/**
 * Worktree作成実行時にCLIから受け取る入力値
 */
export type CreateWorktreeInput = {
  /** CLIで指定されたブランチ名 */
  readonly branch: string;
};

/**
 * Worktree作成完了時にUIへ返す結果
 */
export type WorktreeCreationResult = {
  /** `~/.git-worktree-manager/`配下に生成されたターゲットパス */
  readonly targetPath: string;
  /** 利用者が指定したブランチ名 */
  readonly branchName: string;
  /** ファイルシステム用にサニタイズされたブランチ名 */
  readonly sanitizedBranchName: string;
  /** 生成されたworktreeのHEADコミットSHA */
  readonly headCommit: string;
};

/**
 * Worktree作成を実行するユースケース
 *
 * @param input - CLIから受け取ったブランチ情報
 * @returns worktree作成結果
 */
export async function createWorktree(input: CreateWorktreeInput): Promise<WorktreeCreationResult> {
  const sanitizedBranch = sanitizeBranchName(input.branch);

  return provisionWorktree({
    branch: sanitizedBranch,
  });
}
