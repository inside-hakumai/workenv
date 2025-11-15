import React from 'react';
import { describe, expect, test, vi, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import GwmApp from '../../../src/ui/gwm/App.js';
import type { WorktreeCreationResult } from '../../../src/usecase/createWorktree.js';
import * as createWorktreeModule from '../../../src/usecase/createWorktree.js';

void React;

const flushAsync = () =>
  new Promise<void>(resolve => {
    setTimeout(resolve, 0);
  });

const stripAnsi = (value: string) => value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '');

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe('GwmApp', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('worktree作成中は進捗メッセージを表示する', async () => {
    // Given
    // 非同期処理が完了していない状態
    const branch = 'feature/pending';
    const deferred = createDeferred<WorktreeCreationResult>();
    const createWorktreeMock = vi.spyOn(createWorktreeModule, 'createWorktree').mockReturnValue(deferred.promise);

    // When
    // コンポーネントを描画したとき
    const { lastFrame } = render(<GwmApp branch={branch} />);

    // Then
    // サービス呼び出しが始まり、進捗メッセージが表示される
    expect(createWorktreeMock).toHaveBeenCalledWith({ branch });
    const output = stripAnsi(lastFrame() ?? '');
    expect(output).toContain('worktree作成中...');
    expect(output).toContain(branch);

    // Cleanup
    deferred.resolve({
      branchName: branch,
      sanitizedBranchName: branch,
      targetPath: '/tmp/mock',
      headCommit: 'abc123def456',
    });
    await flushAsync();
    await flushAsync();
  });

  test('成功時にPATH/BRANCH/HEADの一行ログとサニタイズ情報を表示する', async () => {
    // Given
    const branch = 'feature/sanitize';
    const result: WorktreeCreationResult = {
      branchName: branch,
      sanitizedBranchName: 'feature_sanitize',
      targetPath: '/Users/test/.git-worktree-manager/repo_feature_sanitize',
      headCommit: 'fedcba9876543210',
    };
    vi.spyOn(createWorktreeModule, 'createWorktree').mockResolvedValue(result);

    // When
    const { lastFrame } = render(<GwmApp branch={branch} />);
    await flushAsync();

    // Then
    const output = stripAnsi(lastFrame() ?? '');
    expect(output).toContain(`PATH=${result.targetPath}`);
    expect(output).toContain(`BRANCH=${result.branchName}`);
    expect(output).toContain(`HEAD=${result.headCommit}`);
    expect(output).toContain(`${result.branchName} -> ${result.sanitizedBranchName}`);
  });

  test('失敗時はエラーメッセージを表示し標準エラーへも転送する', async () => {
    // Given
    const branch = 'feature/error-case';
    const failure = new Error('git worktree add failed');
    vi.spyOn(createWorktreeModule, 'createWorktree').mockRejectedValue(failure);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    // When
    const { lastFrame } = render(<GwmApp branch={branch} />);
    await flushAsync();

    // Then
    const output = stripAnsi(lastFrame() ?? '');
    expect(output).toContain('エラー');
    expect(output).toContain(failure.message);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining(failure.message));
  });
});
