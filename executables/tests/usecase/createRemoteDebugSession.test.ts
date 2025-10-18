import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { ParsedCliArgs } from '../../src/cli/args.js';

const prepareProfile = vi.fn();
const updateLastLaunchedAt = vi.fn();
vi.mock('../../src/application/services/profileService.js', () => ({
  prepareProfile,
  updateLastLaunchedAt,
}));

const createSession = vi.fn();
vi.mock('../../src/application/services/remoteDebuggingService.js', () => ({
  createSession,
}));

const registerSession = vi.fn();
const unregisterSession = vi.fn();
const clearAllSessions = vi.fn();
vi.mock('../../src/infrastructure/session/sessionRegistry.js', () => ({
  registerSession,
  unregisterSession,
  clearAllSessions,
  findSessionByProfile: vi.fn(),
  findSessionById: vi.fn(),
}));

beforeEach(() => {
  clearAllSessions();
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('createRemoteDebugSession usecase', () => {
  test('プロファイル準備とセッション作成、最終起動日時更新を順番に実行する', async () => {
    // Given
    // 正常にセッションを作成できる入力とサービスのモックが用意された状態
    const args: ParsedCliArgs = {
      url: 'https://example.com',
      profile: 'dev',
      port: 9333,
      additionalArgs: ['--headless'],
    };

    const profileState = {
      profileName: args.profile,
      dataDirectory: '/tmp/dev',
      lockFilePath: '/tmp/dev/session.lock',
      locked: false,
      createdAt: new Date('2024-06-01T00:00:00Z'),
      lastLaunchedAt: new Date('2024-06-10T00:00:00Z'),
    };

    prepareProfile.mockResolvedValue(profileState);

    const sessionLaunchTime = new Date('2024-06-15T09:30:00Z');

    createSession.mockResolvedValue({
      sessionId: 'session-001',
      port: args.port,
      wsEndpoint: 'ws://127.0.0.1:9333/devtools/browser/mock',
      profile: {
        profileName: args.profile,
        dataDirectory: profileState.dataDirectory,
        locked: true,
        lastLaunchedAt: sessionLaunchTime,
      },
      launchDurationMs: 1500,
    });

    updateLastLaunchedAt.mockResolvedValue({
      ...profileState,
      locked: false,
      lastLaunchedAt: sessionLaunchTime,
    });

    const { createRemoteDebugSession } = await import('../../src/usecase/createRemoteDebugSession.js');

    // When
    // ユースケースを実行したとき
    const response = await createRemoteDebugSession(args);

    // Then
    // プロファイルサービスとセッション作成サービスが適切に呼び出され、更新済みプロファイルが返る
    expect(prepareProfile).toHaveBeenCalledWith(args.profile);
    expect(createSession).toHaveBeenCalledWith({
      url: args.url,
      profileName: args.profile,
      port: args.port,
      additionalArgs: args.additionalArgs,
    });
    expect(updateLastLaunchedAt).toHaveBeenCalledWith(args.profile, sessionLaunchTime);
    expect(response.profile.dataDirectory).toBe(profileState.dataDirectory);
    expect(response.profile.locked).toBe(false);
    expect(response.profile.lastLaunchedAt?.toISOString()).toBe(sessionLaunchTime.toISOString());

    // セッションが登録されることを確認
    expect(registerSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-001',
        profileName: args.profile,
        port: args.port,
      }),
    );
  });

  test('プロファイル準備でエラーが発生した場合、そのエラーを呼び出し元へ伝播する', async () => {
    // Given
    // プロファイル準備で例外が発生する状態
    const args: ParsedCliArgs = {
      url: 'https://example.com',
      profile: 'conflict',
    };

    const error = new Error('profile locked');
    prepareProfile.mockRejectedValue(error);

    const { createRemoteDebugSession } = await import('../../src/usecase/createRemoteDebugSession.js');

    // When
    // ユースケースを実行したとき
    const act = async () => createRemoteDebugSession(args);

    // Then
    // エラーが伝播し、セッション作成は呼び出されず、セッションも登録されない
    await expect(act()).rejects.toBe(error);
    expect(createSession).not.toHaveBeenCalled();
    expect(updateLastLaunchedAt).not.toHaveBeenCalled();
    expect(registerSession).not.toHaveBeenCalled();
  });
});
