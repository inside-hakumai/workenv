import { describe, beforeEach, expect, test, vi } from 'vitest';
import { runGitCommand } from '../../../src/infrastructure/git/gitCommandRunner.js';
import {
  assertBranchExists,
  checkWorktreeCollision,
  getRepositoryContext,
} from '../../../src/infrastructure/git/gitRepositoryInspector.js';
import {
  BranchNotFoundError,
  GitCommandError,
  NotAGitRepositoryError,
  WorktreeConflictError,
} from '../../../src/shared/errors.js';

vi.mock('../../../src/infrastructure/git/gitCommandRunner.js', () => ({
  runGitCommand: vi.fn(),
}));

const runGitCommandMock = vi.mocked(runGitCommand);

const createGitCommandError = (message: string, command: readonly string[]) =>
  new GitCommandError(message, command, 'fatal error', 128);

describe('gitRepositoryInspector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('getRepositoryContextはリポジトリルートと名称を返す', async () => {
    // Given
    runGitCommandMock.mockResolvedValue({
      stdout: '/Users/tester/work/app\n',
      stderr: '',
    });

    // When
    const context = await getRepositoryContext();

    // Then
    expect(context).toStrictEqual({
      repoRoot: '/Users/tester/work/app',
      repoName: 'app',
    });
    expect(runGitCommandMock).toHaveBeenCalledWith(['rev-parse', '--show-toplevel']);
  });

  test('getRepositoryContextはGitリポジトリ外の場合にNotAGitRepositoryErrorを投げる', async () => {
    // Given
    runGitCommandMock.mockRejectedValue(
      createGitCommandError("fatal: not a git repository (or any of the parent directories): '.'", [
        'rev-parse',
        '--show-toplevel',
      ]),
    );

    // Then
    await expect(getRepositoryContext()).rejects.toBeInstanceOf(NotAGitRepositoryError);
  });

  test('assertBranchExistsはローカルブランチ存在確認に成功したら何も返さない', async () => {
    // Given
    runGitCommandMock.mockResolvedValue({
      stdout: '',
      stderr: '',
    });

    // When
    await assertBranchExists('/repo/app', 'feature/new-ui');

    // Then
    expect(runGitCommandMock).toHaveBeenCalledWith(['show-ref', '--verify', 'refs/heads/feature/new-ui'], {
      cwd: '/repo/app',
    });
  });

  test('assertBranchExistsはブランチが存在しない場合BranchNotFoundErrorを投げる', async () => {
    // Given
    runGitCommandMock.mockRejectedValue(
      createGitCommandError("fatal: 'feature/new-ui' - not a branch", [
        'show-ref',
        '--verify',
        'refs/heads/feature/new-ui',
      ]),
    );

    // Then
    await expect(assertBranchExists('/repo/app', 'feature/new-ui')).rejects.toBeInstanceOf(BranchNotFoundError);
  });

  test('checkWorktreeCollisionは衝突が無ければ成功する', async () => {
    // Given
    runGitCommandMock.mockResolvedValue({
      stdout: [
        'worktree /repo/app',
        'HEAD a1b2c3d',
        'branch refs/heads/main',
        '',
        'worktree /repo/app/.git/worktrees/feature-old',
        'HEAD 123abc',
        'branch refs/heads/feature/old',
        '',
      ].join('\n'),
      stderr: '',
    });

    // When / Then
    await expect(
      checkWorktreeCollision({
        repoRoot: '/repo/app',
        targetPath: '/home/tester/.git-worktree-manager/app_feature-new',
        branchRef: 'refs/heads/feature/new',
      }),
    ).resolves.toBeUndefined();

    expect(runGitCommandMock).toHaveBeenCalledWith(['worktree', 'list', '--porcelain'], { cwd: '/repo/app' });
  });

  test('checkWorktreeCollisionはターゲットパスが既に存在する場合WorktreeConflictErrorを投げる', async () => {
    // Given
    runGitCommandMock.mockResolvedValue({
      stdout: ['worktree /home/tester/.git-worktree-manager/app_feature-new', 'branch refs/heads/feature/new'].join(
        '\n',
      ),
      stderr: '',
    });

    // Then
    await expect(
      checkWorktreeCollision({
        repoRoot: '/repo/app',
        targetPath: '/home/tester/.git-worktree-manager/app_feature-new',
        branchRef: 'refs/heads/feature/new',
      }),
    ).rejects.toBeInstanceOf(WorktreeConflictError);

    try {
      await checkWorktreeCollision({
        repoRoot: '/repo/app',
        targetPath: '/home/tester/.git-worktree-manager/app_feature-new',
        branchRef: 'refs/heads/feature/new',
      });
    } catch (error: unknown) {
      if (!(error instanceof WorktreeConflictError)) {
        throw error;
      }

      expect(error.conflicts).toEqual([
        {
          type: 'path',
          existingPath: '/home/tester/.git-worktree-manager/app_feature-new',
        },
        {
          type: 'branch',
          existingPath: '/home/tester/.git-worktree-manager/app_feature-new',
          branchRef: 'refs/heads/feature/new',
        },
      ]);
    }
  });

  test('checkWorktreeCollisionは同一ブランチのworktreeが存在する場合WorktreeConflictErrorを投げる', async () => {
    // Given
    runGitCommandMock.mockResolvedValue({
      stdout: [
        'worktree /repo/app/.git/worktrees/feature-existing',
        'HEAD 987654',
        'branch refs/heads/feature/new',
      ].join('\n'),
      stderr: '',
    });

    // Then
    await expect(
      checkWorktreeCollision({
        repoRoot: '/repo/app',
        targetPath: '/home/tester/.git-worktree-manager/app_feature-new',
        branchRef: 'refs/heads/feature/new',
      }),
    ).rejects.toBeInstanceOf(WorktreeConflictError);

    try {
      await checkWorktreeCollision({
        repoRoot: '/repo/app',
        targetPath: '/home/tester/.git-worktree-manager/app_feature-new',
        branchRef: 'refs/heads/feature/new',
      });
    } catch (error: unknown) {
      if (!(error instanceof WorktreeConflictError)) {
        throw error;
      }

      expect(error.conflicts).toEqual([
        {
          type: 'branch',
          existingPath: '/repo/app/.git/worktrees/feature-existing',
          branchRef: 'refs/heads/feature/new',
        },
      ]);
    }
  });
});
