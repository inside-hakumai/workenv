import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { exitCodes } from '../../../src/shared/errors.js';

const temporaryRoots: string[] = [];

const createTemporaryProfileDir = (
  profileName: string,
): { root: string; dataDirectory: string; lockFilePath: string } => {
  const root = mkdtempSync(join(tmpdir(), 'workenv-profile-service-'));
  temporaryRoots.push(root);
  const dataDirectory = join(root, profileName);
  const lockFilePath = join(dataDirectory, 'session.lock');
  return { root, dataDirectory, lockFilePath };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('prepareProfile', () => {
  test('メタデータが存在しない場合、新規作成して最終起動日時なしの状態を返す', async () => {
    // Given
    // メタデータが存在しない新規プロファイルが指定された状態
    const profileName = 'fresh';
    const { dataDirectory, lockFilePath } = createTemporaryProfileDir(profileName);

    const fsPromises = await import('node:fs/promises');
    const profileDirectoryModule = await import('../../../src/infrastructure/storage/profileDirectory.js');
    vi.spyOn(profileDirectoryModule, 'ensureProfileDirectory').mockImplementation(async () => {
      await fsPromises.mkdir(dataDirectory, { recursive: true });
      return {
        dataDirectory,
        lockFilePath,
        locked: false,
      };
    });

    const { prepareProfile } = await import('../../../src/application/services/profileService.js');

    // When
    // プロファイル準備を実行したとき
    const result = await prepareProfile(profileName);

    // Then
    // メタデータファイルが作成され、最終起動日時が未設定で返る
    expect(result.profileName).toBe(profileName);
    expect(result.dataDirectory).toBe(dataDirectory);
    expect(result.locked).toBe(false);
    expect(result.lastLaunchedAt).toBeUndefined();

    const metadata = JSON.parse(await fsPromises.readFile(join(dataDirectory, 'profile.json'), 'utf8')) as {
      lastLaunchedAt: string | undefined;
    };
    expect(metadata.lastLaunchedAt).toBeNull();
  });

  test('ロックが検出された場合、ProfileLockedErrorを送出する', async () => {
    // Given
    // ロックファイルが存在するプロファイルが指定された状態
    const profileName = 'locked';
    const { dataDirectory, lockFilePath } = createTemporaryProfileDir(profileName);

    const fsPromises = await import('node:fs/promises');
    const profileDirectoryModule = await import('../../../src/infrastructure/storage/profileDirectory.js');
    vi.spyOn(profileDirectoryModule, 'ensureProfileDirectory').mockImplementation(async () => {
      await fsPromises.mkdir(dataDirectory, { recursive: true });
      return {
        dataDirectory,
        lockFilePath,
        locked: true,
      };
    });

    const { prepareProfile } = await import('../../../src/application/services/profileService.js');

    // When
    // プロファイル準備を実行したとき
    const act = async () => prepareProfile(profileName);

    // Then
    // プロファイルロックエラーが送出される
    await expect(act()).rejects.toMatchObject({
      exitCode: exitCodes.profileLocked,
    });
  });

  test('既存メタデータがある場合、その内容を読み込んで返す', async () => {
    // Given
    // 既存メタデータが保存されたプロファイル
    const profileName = 'existing';
    const { dataDirectory, lockFilePath } = createTemporaryProfileDir(profileName);
    const fsPromises = await import('node:fs/promises');
    await fsPromises.mkdir(dataDirectory, { recursive: true });
    const createdAt = new Date('2024-04-01T00:00:00Z').toISOString();
    const lastLaunchedAt = new Date('2024-04-10T12:34:56Z').toISOString();
    writeFileSync(
      join(dataDirectory, 'profile.json'),
      JSON.stringify({
        profileName,
        createdAt,
        lastLaunchedAt,
      }),
    );

    const profileDirectoryModule = await import('../../../src/infrastructure/storage/profileDirectory.js');
    vi.spyOn(profileDirectoryModule, 'ensureProfileDirectory').mockImplementation(async () => {
      return {
        dataDirectory,
        lockFilePath,
        locked: false,
      };
    });

    const { prepareProfile } = await import('../../../src/application/services/profileService.js');

    // When
    // プロファイル準備を実行したとき
    const result = await prepareProfile(profileName);

    // Then
    // 既存メタデータが読み込まれる
    expect(result.createdAt?.toISOString()).toBe(createdAt);
    expect(result.lastLaunchedAt?.toISOString()).toBe(lastLaunchedAt);
  });
});

describe('updateLastLaunchedAt', () => {
  test('指定した日時で最終起動日時を更新し、保存結果を返す', async () => {
    // Given
    // メタデータが存在するプロファイルと更新する日時
    const profileName = 'update';
    const { dataDirectory, lockFilePath } = createTemporaryProfileDir(profileName);
    const fsPromises = await import('node:fs/promises');
    await fsPromises.mkdir(dataDirectory, { recursive: true });
    writeFileSync(
      join(dataDirectory, 'profile.json'),
      JSON.stringify({
        profileName,
        createdAt: new Date('2024-05-01T00:00:00Z').toISOString(),
        lastLaunchedAt: null,
      }),
    );

    const profileDirectoryModule = await import('../../../src/infrastructure/storage/profileDirectory.js');
    vi.spyOn(profileDirectoryModule, 'ensureProfileDirectory').mockResolvedValue({
      dataDirectory,
      lockFilePath,
      locked: false,
    });

    const { updateLastLaunchedAt } = await import('../../../src/application/services/profileService.js');
    const launchedAt = new Date('2024-05-02T08:30:00Z');

    // When
    // 最終起動日時の更新を実行したとき
    const result = await updateLastLaunchedAt(profileName, launchedAt);

    // Then
    // メタデータに最終起動日時が保存され、返却値にも反映される
    expect(result.lastLaunchedAt?.toISOString()).toBe(launchedAt.toISOString());
    const savedMetadata = JSON.parse(await fsPromises.readFile(join(dataDirectory, 'profile.json'), 'utf8')) as {
      lastLaunchedAt: string | undefined;
    };
    expect(savedMetadata.lastLaunchedAt).toBe(launchedAt.toISOString());
  });

  test('更新時にロックが検出された場合、ProfileLockedErrorを送出する', async () => {
    // Given
    // ロック中のプロファイルに対して更新を試みる状態
    const profileName = 'locked-update';
    const { dataDirectory, lockFilePath } = createTemporaryProfileDir(profileName);
    const profileDirectoryModule = await import('../../../src/infrastructure/storage/profileDirectory.js');
    vi.spyOn(profileDirectoryModule, 'ensureProfileDirectory').mockResolvedValue({
      dataDirectory,
      lockFilePath,
      locked: true,
    });

    const { updateLastLaunchedAt } = await import('../../../src/application/services/profileService.js');

    // When
    // 最終起動日時の更新を実行したとき
    const act = async () => updateLastLaunchedAt(profileName, new Date());

    // Then
    // プロファイルロックエラーが送出される
    await expect(act()).rejects.toMatchObject({
      exitCode: exitCodes.profileLocked,
    });
  });
});
