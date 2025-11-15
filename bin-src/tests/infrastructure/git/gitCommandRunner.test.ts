import { Buffer } from 'node:buffer';
import { EventEmitter } from 'node:events';
import * as childProcess from 'node:child_process';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { runGitCommand } from '../../../src/infrastructure/git/gitCommandRunner.js';
import { GitCommandError, GitNotFoundError } from '../../../src/shared/errors.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

type MockStream = EventEmitter & {
  removeListener: EventEmitter['removeListener'];
};

type MockGitProcess = EventEmitter & {
  stdout: MockStream;
  stderr: MockStream;
};

const spawnMock = vi.mocked(childProcess.spawn);

const createMockProcess = (): MockGitProcess => {
  const stdout = new EventEmitter() as MockStream;
  const stderr = new EventEmitter() as MockStream;
  const processEmitter = new EventEmitter() as MockGitProcess;
  processEmitter.stdout = stdout;
  processEmitter.stderr = stderr;
  return processEmitter;
};

describe('runGitCommand', () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('gitコマンドが成功した場合、stdout/stderrをまとめて返す', async () => {
    // Given
    // git status --short を実行して成功する状態
    const mockProcess = createMockProcess();
    spawnMock.mockReturnValue(mockProcess as unknown as childProcess.ChildProcessWithoutNullStreams);

    // When
    // gitコマンドを実行したとき
    const resultPromise = runGitCommand(['status', '--short'], { cwd: '/repo/app' });

    setTimeout(() => {
      mockProcess.stdout.emit('data', Buffer.from(' M package.json\n'));
      mockProcess.stderr.emit('data', Buffer.from('warning: LF will be replaced\n'));
      mockProcess.emit('close', 0, null);
    }, 0);

    const result = await resultPromise;

    // Then
    // stdout/stderrが集約され、spawnにはcwdが渡る
    expect(result).toStrictEqual({
      stdout: ' M package.json\n',
      stderr: 'warning: LF will be replaced\n',
    });

    expect(spawnMock).toHaveBeenCalledWith('git', ['status', '--short'], {
      cwd: '/repo/app',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  });

  test('gitが非ゼロ終了した場合、GitCommandErrorを投げstderrと終了コードを保持する', async () => {
    // Given
    // ブランチが存在せずgit show-refが失敗する状態
    const mockProcess = createMockProcess();
    spawnMock.mockReturnValue(mockProcess as unknown as childProcess.ChildProcessWithoutNullStreams);

    // When
    const resultPromise = runGitCommand(['show-ref', '--verify', 'refs/heads/feature/new-ui'], { cwd: '/repo/app' });

    setTimeout(() => {
      mockProcess.stderr.emit('data', Buffer.from("fatal: 'feature/new-ui' - not a branch\n"));
      mockProcess.emit('close', 128, null);
    }, 0);

    // Then
    await expect(resultPromise).rejects.toBeInstanceOf(GitCommandError);

    try {
      await resultPromise;
      throw new Error('GitCommandErrorが発生しませんでした');
    } catch (error: unknown) {
      if (!(error instanceof GitCommandError)) {
        throw error;
      }

      expect(error.stderr).toBe("fatal: 'feature/new-ui' - not a branch\n");
      expect(error.gitExitCode).toBe(128);
      expect(error.command).toEqual(['show-ref', '--verify', 'refs/heads/feature/new-ui']);
    }
  });

  test('gitバイナリが見つからない場合、GitNotFoundErrorを投げる', async () => {
    // Given
    // PATHにgitが存在しない状態
    const mockProcess = createMockProcess();
    spawnMock.mockReturnValue(mockProcess as unknown as childProcess.ChildProcessWithoutNullStreams);

    // When
    const resultPromise = runGitCommand(['status']);

    setTimeout(() => {
      const error = Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' as NodeJS.ErrnoException['code'] });
      mockProcess.emit('error', error);
    }, 0);

    // Then
    await expect(resultPromise).rejects.toBeInstanceOf(GitNotFoundError);
  });

  test('spawnエラーがENOENT以外の場合、GitCommandErrorを投げる', async () => {
    // Given
    // プロセス起動時に権限エラーが発生する状態
    const mockProcess = createMockProcess();
    spawnMock.mockReturnValue(mockProcess as unknown as childProcess.ChildProcessWithoutNullStreams);

    // When
    const resultPromise = runGitCommand(['status']);

    setTimeout(() => {
      const error = Object.assign(new Error('spawn EACCES'), { code: 'EACCES' as NodeJS.ErrnoException['code'] });
      mockProcess.emit('error', error);
    }, 0);

    // Then
    await expect(resultPromise).rejects.toBeInstanceOf(GitCommandError);
  });
});
