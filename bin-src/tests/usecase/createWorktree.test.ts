import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { SanitizedBranchName } from '../../src/domain/branchNameSanitizer.js';
import type { WorktreeCreationResult } from '../../src/usecase/createWorktree.js';

const sanitizeBranchName = vi.fn();
vi.mock('../../src/domain/branchNameSanitizer.js', () => ({
  sanitizeBranchName,
}));

const provisionWorktree = vi.fn();
vi.mock('../../src/application/services/worktreeProvisioningService.js', () => ({
  provisionWorktree,
}));

describe('createWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('ブランチ名をサニタイズしてサービスを実行し、結果を返す', async () => {
    // Given
    // featureブランチのworktree作成を要求したときにサニタイズとサービスが正常に応答する
    const branch = 'feature/login-page';
    const sanitizedBranch: SanitizedBranchName = {
      original: branch,
      sanitized: 'feature_login-page',
    };
    const serviceResult: WorktreeCreationResult = {
      targetPath: '/home/user/.git-worktree-manager/app_feature_login-page',
      branchName: branch,
      sanitizedBranchName: sanitizedBranch.sanitized,
      headCommit: 'abcdef1234567890',
    };
    sanitizeBranchName.mockReturnValue(sanitizedBranch);
    provisionWorktree.mockResolvedValue(serviceResult);
    const { createWorktree } = await import('../../src/usecase/createWorktree.js');

    // When
    // createWorktreeを実行したとき
    const result = await createWorktree({ branch });

    // Then
    // サニタイズ結果がサービスへ渡され、PATH/BRANCH/HEADを含む結果が返る
    expect(sanitizeBranchName).toHaveBeenCalledWith(branch);
    expect(provisionWorktree).toHaveBeenCalledWith({ branch: sanitizedBranch });
    expect(result).toBe(serviceResult);
  });

  test('Worktree作成が失敗した場合、例外をそのまま伝播する', async () => {
    // Given
    // Git側で衝突が発生しサービスが例外を投げる状態
    const branch = 'feature/conflict';
    const sanitizedBranch: SanitizedBranchName = {
      original: branch,
      sanitized: 'feature_conflict',
    };
    const error = new Error('worktree conflict');
    sanitizeBranchName.mockReturnValue(sanitizedBranch);
    provisionWorktree.mockRejectedValue(error);
    const { createWorktree } = await import('../../src/usecase/createWorktree.js');

    // When
    // createWorktreeを実行したとき
    const act = async () => createWorktree({ branch });

    // Then
    // サービスの例外が伝播し、追加処理は行われない
    await expect(act()).rejects.toBe(error);
    expect(sanitizeBranchName).toHaveBeenCalledWith(branch);
    expect(provisionWorktree).toHaveBeenCalledWith({ branch: sanitizedBranch });
  });
});
