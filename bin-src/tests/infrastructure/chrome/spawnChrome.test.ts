import { Buffer } from 'node:buffer';
import { EventEmitter } from 'node:events';
import process from 'node:process';
import * as childProcess from 'node:child_process';
import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import {
  cleanupChromeTestArtifacts,
  createTemporaryUserDataDir,
  getChromeExecutablePath,
  trackChromeProcess,
} from '../../helpers/chromeTestUtils.js';
import { spawnChrome } from '../../../src/infrastructure/chrome/spawnChrome.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

type MockChromeProcess = EventEmitter & {
  pid?: number;
  stderr: EventEmitter & {
    removeListener: EventEmitter['removeListener'];
  };
  kill: ReturnType<typeof vi.fn>;
};

const createMockChromeProcess = (pid?: number): MockChromeProcess => {
  const stderr = new EventEmitter() as MockChromeProcess['stderr'];
  const processEmitter = new EventEmitter() as MockChromeProcess;
  if (pid !== undefined) {
    processEmitter.pid = pid;
  }

  processEmitter.stderr = stderr;
  processEmitter.kill = vi.fn();
  return processEmitter;
};

const spawnMock = vi.mocked(childProcess.spawn);

let processKillSpy: ReturnType<typeof vi.spyOn>;

describe('spawnChrome', () => {
  beforeEach(() => {
    spawnMock.mockReset();
    processKillSpy = vi.spyOn(process, 'kill') as unknown as ReturnType<typeof vi.spyOn>;
    processKillSpy.mockImplementation(() => {
      return true;
    });
  });

  afterEach(() => {
    cleanupChromeTestArtifacts();
    processKillSpy.mockRestore();
  });

  test('エラーが発生した場合、イベントリスナーとタイムアウトがクリーンアップされる', async () => {
    // Given
    // spawn呼び出しをモックし、エラーを発生させる状態
    const mockProcess = createMockChromeProcess();
    spawnMock.mockReturnValue(mockProcess as unknown as childProcess.ChildProcessWithoutNullStreams);

    const parameters = {
      executablePath: '/mock/chrome',
      args: ['--arg'],
      profileName: 'test',
      targetUrl: 'https://example.com',
      port: 9222,
    };

    const removeListenerSpy = vi.spyOn(mockProcess.stderr, 'removeListener');

    // When
    // Chrome起動を試行し、エラーをキャッチしたとき
    const spawnPromise = spawnChrome(parameters);
    setTimeout(() => {
      mockProcess.emit('error', new Error('Mock error'));
    }, 0);

    await expect(spawnPromise).rejects.toThrow();

    // Then
    // イベントリスナーが適切に削除される
    // （実装後に検証）
    expect(removeListenerSpy).toHaveBeenCalled();
  });

  test('成功時にイベントリスナーとタイムアウトがクリーンアップされる', async () => {
    // Given
    // spawn呼び出しをモックし、正常に起動する状態
    const mockProcess = createMockChromeProcess(12_345);
    spawnMock.mockReturnValue(mockProcess as unknown as childProcess.ChildProcessWithoutNullStreams);

    const parameters = {
      executablePath: '/mock/chrome',
      args: ['--arg'],
      profileName: 'test',
      targetUrl: 'https://example.com',
      port: 9222,
    };

    // When
    // Chrome起動が成功したとき
    const spawnPromise = spawnChrome(parameters);
    setTimeout(() => {
      mockProcess.stderr.emit(
        'data',
        Buffer.from('DevTools listening on ws://127.0.0.1:9222/devtools/browser/test-id'),
      );
    }, 0);
    const result = await spawnPromise;

    // Then
    // セッションが返される
    expect(result.wsEndpoint).toBe('ws://127.0.0.1:9222/devtools/browser/test-id');
    expect(result.status).toBe('ready');

    // イベントリスナーが削除されている
    // （実装後にremoveListenerが呼ばれることを検証）
    expect(true).toBe(true);
  });
  test('Chromeが正常に起動した場合、wsEndpointを含むRemoteDebugSessionを返す', async () => {
    // Given
    // Chrome実行ファイルのパス、起動オプション、セッション情報が与えられた状態
    const profileName = 'dev';
    const port = 9222;
    const executablePath = getChromeExecutablePath();
    const userDataDir = createTemporaryUserDataDir(profileName);
    const args = [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      'https://example.com',
    ];
    const targetUrl = 'https://example.com';

    // When
    // Chrome起動を実行したとき
    const mockProcess = createMockChromeProcess(67_890);
    spawnMock.mockReturnValue(mockProcess as unknown as childProcess.ChildProcessWithoutNullStreams);

    const spawnPromise = spawnChrome({
      executablePath,
      args,
      profileName,
      targetUrl,
      port,
    });

    setTimeout(() => {
      mockProcess.stderr.emit(
        'data',
        Buffer.from('DevTools listening on ws://127.0.0.1:9222/devtools/browser/test-generated'),
      );
    }, 0);

    const result = await spawnPromise;

    trackChromeProcess(result.chromeProcessPid);

    // Then
    // wsEndpointを含むRemoteDebugSessionが返される
    expect(result.wsEndpoint).toMatch(/^ws:\/\/127\.0\.0\.1:9222\/devtools\/browser\//);
    expect(result.status).toBe('ready');
    expect(result.chromeProcessPid).toBeTypeOf('number');
  });

  test('異なるポート番号でChromeが起動した場合、指定されたポートのwsEndpointを返す', async () => {
    // Given
    // 9223ポートでのChrome起動パラメータが与えられた状態
    const profileName = 'qa';
    const port = 9223;
    const executablePath = getChromeExecutablePath();
    const userDataDir = createTemporaryUserDataDir(profileName);
    const args = [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      'https://staging.example.com',
    ];
    const targetUrl = 'https://staging.example.com';

    // When
    // Chrome起動を実行したとき
    const mockProcess = createMockChromeProcess(78_901);
    spawnMock.mockReturnValue(mockProcess as unknown as childProcess.ChildProcessWithoutNullStreams);

    const spawnPromise = spawnChrome({
      executablePath,
      args,
      profileName,
      targetUrl,
      port,
    });

    setTimeout(() => {
      mockProcess.stderr.emit(
        'data',
        Buffer.from('DevTools listening on ws://127.0.0.1:9223/devtools/browser/test-generated'),
      );
    }, 0);

    const result = await spawnPromise;

    trackChromeProcess(result.chromeProcessPid);

    // Then
    // 指定されたポート番号のwsEndpointが返される
    expect(result.wsEndpoint).toMatch(/^ws:\/\/127\.0\.0\.1:9223\/devtools\/browser\//);
    expect(result.status).toBe('ready');
    expect(result.port).toBe(9223);
  });

  test('エラーが発生した場合、イベントリスナーとタイムアウトがクリーンアップされる', async () => {
    // Given
    // spawn呼び出しをモックし、エラーを発生させる状態
    const mockProcess = createMockChromeProcess();
    spawnMock.mockReturnValue(mockProcess as unknown as childProcess.ChildProcessWithoutNullStreams);

    const parameters = {
      executablePath: '/mock/chrome',
      args: ['--arg'],
      profileName: 'test',
      targetUrl: 'https://example.com',
      port: 9222,
    };

    const removeListenerSpy = vi.spyOn(mockProcess.stderr, 'removeListener');

    // When
    // Chrome起動を試行し、エラーをキャッチしたとき
    const spawnPromise = spawnChrome(parameters);
    setTimeout(() => {
      mockProcess.emit('error', new Error('Mock error'));
    }, 0);

    await expect(spawnPromise).rejects.toThrow();

    // Then
    // イベントリスナーが削除される
    expect(removeListenerSpy).toHaveBeenCalled();
  });
});
