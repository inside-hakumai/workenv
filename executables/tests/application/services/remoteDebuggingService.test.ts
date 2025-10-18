import { join } from 'node:path';
import { expect, test, describe, vi, afterEach } from 'vitest';
import { createSession } from '../../../src/application/services/remoteDebuggingService.js';
import * as browserProfile from '../../../src/domain/browserProfile.js';
import * as detectChromeModule from '../../../src/infrastructure/chrome/detectChromeExecutable.js';
import * as chromeArgumentsModule from '../../../src/infrastructure/chrome/chromeArguments.js';
import * as spawnChromeModule from '../../../src/infrastructure/chrome/spawnChrome.js';
import * as portsModule from '../../../src/infrastructure/ports/autoAllocatePort.js';
import {
  cleanupChromeTestArtifacts,
  createTemporaryUserDataDir,
  getChromeExecutablePath,
  trackChromeProcess,
} from '../../helpers/chromeTestUtils.js';

describe('createSession', () => {
  afterEach(() => {
    cleanupChromeTestArtifacts();
    vi.restoreAllMocks();
  });

  test('URLとプロファイル名が指定された場合、セッション情報とwsEndpointを含むレスポンスを返す', async () => {
    // Given
    // URLとプロファイル名が指定された状態
    const url = 'https://example.com';
    const profileName = 'dev-test';
    const port = 9300;
    const chromePath = getChromeExecutablePath();
    const userDataDir = createTemporaryUserDataDir(profileName);
    const chromeArgs = [`--remote-debugging-port=${port}`, `--user-data-dir=${userDataDir}`, '--no-first-run', url];
    const chromeProcessPid = 54_321;
    const launchedAt = new Date('2024-01-01T00:00:00Z');

    vi.spyOn(detectChromeModule, 'detectChromeExecutable').mockReturnValue(chromePath);
    vi.spyOn(browserProfile, 'resolveProfilePaths').mockReturnValue({
      dataDirectory: userDataDir,
      lockFilePath: join(userDataDir, 'SingletonLock'),
    });
    vi.spyOn(portsModule, 'autoAllocatePort').mockResolvedValue({
      port,
      requestedByUser: false,
      validationOutcome: 'available',
    });
    const buildChromeArgumentsSpy = vi.spyOn(chromeArgumentsModule, 'buildChromeArguments').mockReturnValue(chromeArgs);
    vi.spyOn(spawnChromeModule, 'spawnChrome').mockResolvedValue({
      sessionId: 'session-123',
      profileName,
      targetUrl: url,
      port,
      wsEndpoint: `ws://127.0.0.1:${port}/devtools/browser/mock`,
      chromeProcessPid,
      launchedAt,
      status: 'ready',
    });

    // When
    // セッション作成を実行したとき
    const result = await createSession({
      url,
      profileName,
    });

    trackChromeProcess(result.chromeProcessPid);

    // Then
    // セッション情報とwsEndpointが返される
    expect(result.sessionId).toBe('session-123');
    expect(result.port).toBe(port);
    expect(result.wsEndpoint).toBe(`ws://127.0.0.1:${port}/devtools/browser/mock`);
    expect(result.profile.profileName).toBe(profileName);
    expect(result.profile.dataDirectory).toBe(userDataDir);
    expect(result.profile.locked).toBe(true);
    expect(result.profile.lastLaunchedAt).toEqual(launchedAt);
    expect(result.chromeProcessPid).toBe(chromeProcessPid);
    expect(result.launchDurationMs).toBeGreaterThanOrEqual(0);

    expect(buildChromeArgumentsSpy).toHaveBeenCalledWith({
      port,
      userDataDir,
      url,
    });
    expect(spawnChromeModule.spawnChrome).toHaveBeenCalledWith({
      executablePath: chromePath,
      args: chromeArgs,
      profileName,
      targetUrl: url,
      port,
    });
  });

  test('プロファイルが既に使用中の場合、エラーメッセージとともに例外を投げる', async () => {
    // Given
    // 既に同じプロファイル名でセッションが登録されている状態
    const url = 'https://example.com';
    const profileName = 'dev-test';
    const port = 9300;
    const chromePath = getChromeExecutablePath();
    const userDataDir = createTemporaryUserDataDir(profileName);

    vi.spyOn(detectChromeModule, 'detectChromeExecutable').mockReturnValue(chromePath);
    vi.spyOn(browserProfile, 'resolveProfilePaths').mockReturnValue({
      dataDirectory: userDataDir,
      lockFilePath: join(userDataDir, 'SingletonLock'),
    });
    vi.spyOn(portsModule, 'autoAllocatePort').mockResolvedValue({
      port,
      requestedByUser: false,
      validationOutcome: 'available',
    });

    // プロファイルチェックで既存セッションが見つかる場合をシミュレート
    const sessionRegistryModule = await import('../../../src/infrastructure/session/sessionRegistry.js');
    vi.spyOn(sessionRegistryModule, 'findSessionByProfile').mockReturnValue({
      sessionId: 'existing-session',
      profileName,
      targetUrl: 'https://other.com',
      port: 9222,
      launchedAt: new Date(),
      status: 'ready',
    });

    // When
    // セッション作成を実行したとき

    // Then
    // プロファイル使用中エラーが投げられる
    await expect(createSession({ url, profileName })).rejects.toThrow(`プロファイル ${profileName} は既に使用中です`);
  });

  test('ポート競合が発生した場合、推奨ポート付きエラーを投げる', async () => {
    // Given
    // 指定ポートが占有されている状態
    const url = 'https://example.com';
    const profileName = 'dev-test';
    const requestedPort = 9222;
    const chromePath = getChromeExecutablePath();
    const userDataDir = createTemporaryUserDataDir(profileName);

    vi.spyOn(detectChromeModule, 'detectChromeExecutable').mockReturnValue(chromePath);
    vi.spyOn(browserProfile, 'resolveProfilePaths').mockReturnValue({
      dataDirectory: userDataDir,
      lockFilePath: join(userDataDir, 'SingletonLock'),
    });
    vi.spyOn(portsModule, 'autoAllocatePort').mockResolvedValue({
      port: requestedPort,
      requestedByUser: true,
      validationOutcome: 'occupied',
      errorMessage: 'ポートは既に使用されています',
    });

    const sessionRegistryModule = await import('../../../src/infrastructure/session/sessionRegistry.js');
    vi.spyOn(sessionRegistryModule, 'findSessionByProfile').mockReturnValue(undefined);

    // When
    // セッション作成を実行したとき

    // Then
    // ポート競合エラーが投げられ、推奨ポートが含まれる
    await expect(createSession({ url, profileName, port: requestedPort })).rejects.toThrow(
      /ポート9222は使用できません/,
    );
  });
});
