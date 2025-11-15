/**
 * worktree作成ユースケースの入出力を定義するモジュール
 */

/**
 * worktree作成実行時にCLIから受け取る入力値
 */
export type CreateWorktreeInput = {
  /** CLIで指定されたブランチ名 */
  readonly branch: string;
};

/**
 * worktree作成完了時にUIへ返す結果
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
 * worktree作成を実行するユースケース
 *
 * @param input - CLIから受け取ったブランチ情報
 * @returns worktree作成結果
 */
export async function createWorktree(_input: CreateWorktreeInput): Promise<WorktreeCreationResult> {
  // throw new Error('createWorktree usecase is not implemented yet.');
  // TODO: 実装

  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    branchName: _input.branch,
    sanitizedBranchName: _input.branch,
    targetPath: '/tmp/mock',
    headCommit: 'abc123def456',
  };
}
