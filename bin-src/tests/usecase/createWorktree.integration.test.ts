import { beforeEach, describe, expect, test, vi } from 'vitest';
import { runGitCommand } from '../../src/infrastructure/git/gitCommandRunner.js';
import {
  buildWorktreeTargetPath,
  ensureWorktreeBaseDir,
} from '../../src/infrastructure/worktree/worktreeDirectoryManager.js';
import { BranchNotFoundError, GitCommandError, WorktreeConflictError } from '../../src/shared/errors.js';

vi.mock('../../src/infrastructure/git/gitCommandRunner.js', () => ({
  runGitCommand: vi.fn(),
}));

vi.mock('../../src/infrastructure/worktree/worktreeDirectoryManager.js', () => ({
  ensureWorktreeBaseDir: vi.fn(),
  buildWorktreeTargetPath: vi.fn(),
}));

const runGitCommandMock = vi.mocked(runGitCommand);
const ensureWorktreeBaseDirMock = vi.mocked(ensureWorktreeBaseDir);
const buildWorktreeTargetPathMock = vi.mocked(buildWorktreeTargetPath);

describe('createWorktree integration flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('有効なブランチの場合、PATH/BRANCH/HEADを返す', async () => {
    // Given
    // 存在するブランチのworktree作成を要求し、Gitコマンドがすべて成功する状態
    ensureWorktreeBaseDirMock.mockResolvedValue('/home/tester/.git-worktree-manager');
    buildWorktreeTargetPathMock.mockReturnValue('/home/tester/.git-worktree-manager/app_feature_new-ui');
    runGitCommandMock
      .mockResolvedValueOnce({ stdout: '/repo/app\n', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'abcdef1234567890\n', stderr: '' });
    const { createWorktree } = await import('../../src/usecase/createWorktree.js');

    // When
    // createWorktreeを実行したとき
    const result = await createWorktree({ branch: 'feature/new-ui' });

    // Then
    // サニタイズ済みブランチを含むPATH/BRANCH/HEADが返され、Gitコマンドの呼び出しも期待通りである
    expect({
      result,
      gitCalls: runGitCommandMock.mock.calls.map(([args, options]) => ({ args, cwd: options?.cwd })),
      buildPathCall: buildWorktreeTargetPathMock.mock.calls.at(0),
    }).toStrictEqual({
      result: {
        targetPath: '/home/tester/.git-worktree-manager/app_feature_new-ui',
        branchName: 'feature/new-ui',
        sanitizedBranchName: 'feature_new-ui',
        headCommit: 'abcdef1234567890',
      },
      gitCalls: [
        { args: ['rev-parse', '--show-toplevel'], cwd: undefined },
        { args: ['show-ref', '--verify', 'refs/heads/feature/new-ui'], cwd: '/repo/app' },
        { args: ['worktree', 'list', '--porcelain'], cwd: '/repo/app' },
        {
          args: ['worktree', 'add', '/home/tester/.git-worktree-manager/app_feature_new-ui', 'feature/new-ui'],
          cwd: '/repo/app',
        },
        { args: ['rev-parse', 'HEAD'], cwd: '/home/tester/.git-worktree-manager/app_feature_new-ui' },
      ],
      buildPathCall: ['app', 'feature_new-ui'],
    });
  });

  test('存在しないブランチの場合、BranchNotFoundErrorを返す', async () => {
    // Given
    // 存在しないブランチを指定し、Gitがshow-refで失敗する状態
    runGitCommandMock
      .mockResolvedValueOnce({ stdout: '/repo/app\n', stderr: '' })
      .mockRejectedValueOnce(
        new GitCommandError(
          'show-ref failed',
          ['show-ref', '--verify', 'refs/heads/feature/missing'],
          'fatal: not a branch',
          1,
        ),
      );
    const { createWorktree } = await import('../../src/usecase/createWorktree.js');

    // When / Then
    // createWorktreeを実行するとブランチ不存在エラーが返る
    await expect(createWorktree({ branch: 'feature/missing' })).rejects.toBeInstanceOf(BranchNotFoundError);
  });

  test('既存worktreeと衝突する場合、WorktreeConflictErrorを返す', async () => {
    // Given
    // 指定ブランチが既存worktreeと衝突する状態
    ensureWorktreeBaseDirMock.mockResolvedValue('/home/tester/.git-worktree-manager');
    buildWorktreeTargetPathMock.mockReturnValue('/home/tester/.git-worktree-manager/app_feature_existing');
    runGitCommandMock
      .mockResolvedValueOnce({ stdout: '/repo/app\n', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({
        stdout: [
          'worktree /home/tester/.git-worktree-manager/app_feature_existing',
          'branch refs/heads/feature/existing',
          '',
        ].join('\n'),
        stderr: '',
      });
    const { createWorktree } = await import('../../src/usecase/createWorktree.js');

    // When / Then
    // createWorktreeを実行すると既存worktreeとの衝突エラーが返る
    await expect(createWorktree({ branch: 'feature/existing' })).rejects.toBeInstanceOf(WorktreeConflictError);
  });
});
