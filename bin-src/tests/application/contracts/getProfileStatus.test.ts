import { afterEach, describe, expect, test, vi } from 'vitest';
import type * as profileServiceModule from '../../../src/application/services/profileService.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('getProfileStatus', () => {
  test('プロファイル状態を取得し、APIレスポンス形式に整形する', async () => {
    // Given
    // プロファイルサービスが状態を返す状況
    const profileName = 'dev-profile';
    const dataDirectory = '/tmp/dev-profile';
    const lastLaunchedAt = new Date('2024-06-01T10:15:00Z');

    vi.doMock('../../../src/application/services/profileService.js', async () => {
      const actualModule: typeof profileServiceModule = await vi.importActual(
        '../../../src/application/services/profileService.js',
      );
      return {
        ...actualModule,
        getProfileState: vi.fn(async () => ({
          profileName,
          dataDirectory,
          lockFilePath: `${dataDirectory}/session.lock`,
          locked: false,
          createdAt: new Date('2024-05-01T00:00:00Z'),
          lastLaunchedAt,
        })),
      };
    });

    const { getProfileStatus } = await import('../../../src/application/contracts/getProfileStatus.js');

    // When
    // プロファイル状態取得コントラクトを実行したとき
    const response = await getProfileStatus(profileName);

    // Then
    // プロファイル情報が期待通り整形される
    expect(response.profile.profileName).toBe(profileName);
    expect(response.profile.dataDirectory).toBe(dataDirectory);
    expect(response.profile.locked).toBe(false);
    expect(response.profile.lastLaunchedAt).toBe(lastLaunchedAt.toISOString());
    expect(response.activeSession).toBeUndefined();
  });

  test('ロック状態がtrueの場合もロック情報をそのまま返す', async () => {
    // Given
    // プロファイルがロックされた状態
    const profileName = 'locked-profile';

    vi.doMock('../../../src/application/services/profileService.js', async () => {
      const actualModule: typeof profileServiceModule = await vi.importActual(
        '../../../src/application/services/profileService.js',
      );
      return {
        ...actualModule,
        getProfileState: vi.fn(async () => ({
          profileName,
          dataDirectory: '/tmp/locked-profile',
          lockFilePath: '/tmp/locked-profile/session.lock',
          locked: true,
          createdAt: new Date('2024-05-01T00:00:00Z'),
          lastLaunchedAt: undefined,
        })),
      };
    });

    const { getProfileStatus } = await import('../../../src/application/contracts/getProfileStatus.js');

    // When
    // プロファイル状態取得を実行したとき
    const response = await getProfileStatus(profileName);

    // Then
    // ロック状態が反映されたレスポンスが返る
    expect(response.profile.locked).toBe(true);
    expect(response.profile.lastLaunchedAt).toBeUndefined();
  });
});
