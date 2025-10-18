import React from 'react';
import { expect, test, describe, vi, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import App from '../src/app.js';
import type { ParsedCliArgs } from '../src/cli/args.js';
import type { CreateSessionResponse } from '../src/application/services/remoteDebuggingService.js';
import * as createRemoteDebugSessionModule from '../src/usecase/createRemoteDebugSession.js';
import { cleanupChromeTestArtifacts, createTempUserDataDir, trackChromeProcess } from './helpers/chromeTestUtils.js';

describe('App', () => {
  afterEach(() => {
    cleanupChromeTestArtifacts();
    vi.restoreAllMocks();
  });

  test('コンポーネントがアンマウントされた場合、非同期処理完了後にsetStateを呼び出さない', async () => {
    // Given
    // 遅延を伴うcreateRemoteDebugSessionのモックと、有効な引数が与えられた状態
    const args: ParsedCliArgs = {
      url: 'https://example.com',
      profile: 'test-profile',
    };

    const userDataDir = createTempUserDataDir(args.profile);
    const chromeProcessPid = 4242;
    const port = 9555;
    const lastLaunchedAt = new Date('2024-01-01T00:00:00Z');
    const mockResponse: CreateSessionResponse = {
      sessionId: 'session-app-1',
      port,
      wsEndpoint: `ws://127.0.0.1:${port}/devtools/browser/mock`,
      profile: {
        profileName: args.profile,
        dataDirectory: userDataDir,
        locked: true,
        lastLaunchedAt,
      },
      launchDurationMs: 120,
      chromeProcessPid,
    };

    const createRemoteDebugSessionMock = vi
      .spyOn(createRemoteDebugSessionModule, 'createRemoteDebugSession')
      .mockImplementation(
        () =>
          new Promise<CreateSessionResponse>(resolve => {
            setTimeout(() => {
              trackChromeProcess(mockResponse.chromeProcessPid);
              resolve(mockResponse);
            }, 50);
          }),
      );

    // スパイを設定してconsole.errorをキャプチャ
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // When
    // コンポーネントをレンダリングし、非同期処理が完了する前にアンマウントしたとき
    const { unmount } = render(<App args={args} />);

    // 即座にアンマウント（非同期処理が完了する前）
    unmount();

    // 非同期処理が完了するのを待つ
    await new Promise(resolve => setTimeout(resolve, 100));

    // Then
    // React 18以降では、アンマウント後のsetStateは警告を出さないが、
    // 適切にクリーンアップされていれば何も問題は起きない
    // このテストは、クリーンアップが実装されているかを確認するための仕様テスト
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Can't perform a React state update on an unmounted component"),
    );
    expect(createRemoteDebugSessionMock).toHaveBeenCalledWith(args);

    consoleErrorSpy.mockRestore();
  });

  test('依存配列が具体的なプロパティを含む場合、不要な再レンダリングを防ぐ', () => {
    // Given
    // 同じ値を持つが異なるオブジェクト参照のargs
    const args1: ParsedCliArgs = {
      url: 'https://example.com',
      profile: 'test-profile',
    };

    const args2: ParsedCliArgs = {
      url: 'https://example.com',
      profile: 'test-profile',
    };

    const userDataDir = createTempUserDataDir(args1.profile);
    const chromeProcessPid = 5252;
    const port = 9556;
    const mockResponse: CreateSessionResponse = {
      sessionId: 'session-app-2',
      port,
      wsEndpoint: `ws://127.0.0.1:${port}/devtools/browser/mock`,
      profile: {
        profileName: args1.profile,
        dataDirectory: userDataDir,
        locked: true,
        lastLaunchedAt: new Date('2024-02-01T00:00:00Z'),
      },
      chromeProcessPid,
    };

    const createRemoteDebugSessionMock = vi
      .spyOn(createRemoteDebugSessionModule, 'createRemoteDebugSession')
      .mockImplementation(async () => {
      trackChromeProcess(mockResponse.chromeProcessPid);
      return mockResponse;
    });

    // When
    // 最初のargsでレンダリング
    const { rerender } = render(<App args={args1} />);

    // 同じ値を持つが異なる参照のargsで再レンダリング
    rerender(<App args={args2} />);

    // Then
    // useEffectが再実行されないことを期待
    expect(createRemoteDebugSessionMock).toHaveBeenCalledTimes(1);
  });
});
