import { beforeEach, describe, expect, test, vi } from 'vitest';
import { provisionWorktree } from '../../../src/application/services/worktreeProvisioningService.js';
import type { SanitizedBranchName } from '../../../src/domain/branchNameSanitizer.js';
import { runGitCommand } from '../../../src/infrastructure/git/gitCommandRunner.js';
import {
  assertBranchExists,
  checkWorktreeCollision,
  getRepositoryContext,
} from '../../../src/infrastructure/git/gitRepositoryInspector.js';
import {
  buildWorktreeTargetPath,
  ensureWorktreeBaseDir,
} from '../../../src/infrastructure/worktree/worktreeDirectoryManager.js';

vi.mock('../../../src/infrastructure/git/gitCommandRunner.js', () => ({
  runGitCommand: vi.fn(),
}));

vi.mock('../../../src/infrastructure/git/gitRepositoryInspector.js', () => ({
  getRepositoryContext: vi.fn(),
  assertBranchExists: vi.fn(),
  checkWorktreeCollision: vi.fn(),
}));

vi.mock('../../../src/infrastructure/worktree/worktreeDirectoryManager.js', () => ({
  ensureWorktreeBaseDir: vi.fn(),
  buildWorktreeTargetPath: vi.fn(),
}));

const runGitCommandMock = vi.mocked(runGitCommand);
const getRepositoryContextMock = vi.mocked(getRepositoryContext);
const assertBranchExistsMock = vi.mocked(assertBranchExists);
const checkWorktreeCollisionMock = vi.mocked(checkWorktreeCollision);
const ensureWorktreeBaseDirMock = vi.mocked(ensureWorktreeBaseDir);
const buildWorktreeTargetPathMock = vi.mocked(buildWorktreeTargetPath);

describe('provisionWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('指定ブランチのworktree作成に成功した場合、結果を返す', async () => {
    // Given
    // QA担当者が既存リポジトリ内で特定ブランチのworktree作成を要求した状態
    const branch: SanitizedBranchName = {
      original: 'feature/new-ui',
      sanitized: 'feature_new-ui',
    };
    const repoRoot = '/repo/app';
    const targetPath = '/home/tester/.git-worktree-manager/app_feature_new-ui';
    getRepositoryContextMock.mockResolvedValue({
      repoRoot,
      repoName: 'app',
    });
    assertBranchExistsMock.mockResolvedValue();
    ensureWorktreeBaseDirMock.mockResolvedValue('/home/tester/.git-worktree-manager');
    buildWorktreeTargetPathMock.mockReturnValue(targetPath);
    checkWorktreeCollisionMock.mockResolvedValue();
    runGitCommandMock
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'abcdef1234567890\n', stderr: '' });

    // When
    // Worktreeプロビジョニングを実行したとき
    const result = await provisionWorktree({ branch });

    // Then
    // PATH/BRANCH/HEADを含む結果とGitコマンドの呼び出しが得られる
    expect({
      result,
      branchCheck: assertBranchExistsMock.mock.calls,
      gitCalls: runGitCommandMock.mock.calls,
      collisionPlan: checkWorktreeCollisionMock.mock.calls.at(0)?.[0],
    }).toStrictEqual({
      result: {
        branchName: 'feature/new-ui',
        sanitizedBranchName: 'feature_new-ui',
        targetPath,
        headCommit: 'abcdef1234567890',
      },
      branchCheck: [[repoRoot, 'feature/new-ui']],
      gitCalls: [
        [['worktree', 'add', targetPath, 'feature/new-ui'], { cwd: repoRoot }],
        [['rev-parse', 'HEAD'], { cwd: targetPath }],
      ],
      collisionPlan: {
        repoRoot,
        targetPath,
        branchRef: 'refs/heads/feature/new-ui',
      },
    });
  });

  test('refs表記のブランチ指定時は同じrefsを衝突検査へ渡す', async () => {
    // Given
    // 自動化担当者がrefs表記のブランチでworktreeを要求した状態
    const branch: SanitizedBranchName = {
      original: 'refs/heads/release/2025-Q4',
      sanitized: 'release_2025-Q4',
    };
    const repoRoot = '/repo/app';
    const targetPath = '/home/tester/.git-worktree-manager/app_release_2025-Q4';
    getRepositoryContextMock.mockResolvedValue({
      repoRoot,
      repoName: 'app',
    });
    assertBranchExistsMock.mockResolvedValue();
    ensureWorktreeBaseDirMock.mockResolvedValue('/home/tester/.git-worktree-manager');
    buildWorktreeTargetPathMock.mockReturnValue(targetPath);
    checkWorktreeCollisionMock.mockResolvedValue();
    runGitCommandMock
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({ stdout: '1234abcd\n', stderr: '' });

    // When
    // Worktreeプロビジョニングを実行したとき
    const result = await provisionWorktree({ branch });

    // Then
    // refs指定がそのまま衝突検査に渡され、結果にも反映される
    expect({
      result,
      collisionPlan: checkWorktreeCollisionMock.mock.calls.at(0)?.[0],
      gitAddArgs: runGitCommandMock.mock.calls.at(0),
    }).toStrictEqual({
      result: {
        branchName: 'refs/heads/release/2025-Q4',
        sanitizedBranchName: 'release_2025-Q4',
        targetPath,
        headCommit: '1234abcd',
      },
      collisionPlan: {
        repoRoot,
        targetPath,
        branchRef: 'refs/heads/release/2025-Q4',
      },
      gitAddArgs: [['worktree', 'add', targetPath, 'refs/heads/release/2025-Q4'], { cwd: repoRoot }],
    });
  });
});
