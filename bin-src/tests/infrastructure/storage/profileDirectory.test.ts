import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { exitCodes } from '../../../src/shared/errors.js';

const temporaryRoots: string[] = [];

const getTemporaryRoot = (): string => {
  const root = mkdtempSync(join(tmpdir(), 'workenv-profile-dir-'));
  temporaryRoots.push(root);
  return root;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('ensureProfileDirectory', () => {
  test('プロファイルディレクトリが存在しない場合、新規作成してロック未検出として返す', async () => {
    // Given
    // 新規作成されるはずのプロファイルディレクトリが設定された状態
    const temporaryRoot = getTemporaryRoot();
    const profileDir = join(temporaryRoot, 'profiles', 'tester');
    const lockFilePath = join(profileDir, 'session.lock');

    const browserProfile = await import('../../../src/domain/browserProfile.js');
    vi.spyOn(browserProfile, 'resolveProfilePaths').mockReturnValue({
      dataDirectory: profileDir,
      lockFilePath,
    });

    const userDataRoot = await import('../../../src/shared/fs/userDataRoot.js');
    vi.spyOn(userDataRoot, 'ensureUserDataRoot').mockResolvedValue(temporaryRoot);

    const { ensureProfileDirectory } = await import('../../../src/infrastructure/storage/profileDirectory.js');

    // When
    // プロファイルディレクトリの確保を実行したとき
    const result = await ensureProfileDirectory('tester');

    // Then
    // ディレクトリが作成され、ロックは検出されない
    const fsPromises = await import('node:fs/promises');
    const stat = await fsPromises.stat(result.dataDirectory);
    expect(stat.isDirectory()).toBe(true);
    expect(result.dataDirectory).toBe(profileDir);
    expect(result.lockFilePath).toBe(lockFilePath);
    expect(result.locked).toBe(false);
  });

  test('session.lockが既に存在する場合、ロック検出として返す', async () => {
    // Given
    // 事前にロックファイルが作成されたプロファイルディレクトリが存在する状態
    const temporaryRoot = getTemporaryRoot();
    const profileDir = join(temporaryRoot, 'profiles', 'locked-profile');
    const lockFilePath = join(profileDir, 'session.lock');

    const browserProfile = await import('../../../src/domain/browserProfile.js');
    vi.spyOn(browserProfile, 'resolveProfilePaths').mockReturnValue({
      dataDirectory: profileDir,
      lockFilePath,
    });

    const userDataRoot = await import('../../../src/shared/fs/userDataRoot.js');
    vi.spyOn(userDataRoot, 'ensureUserDataRoot').mockImplementation(async () => {
      const fsPromises = await import('node:fs/promises');
      await fsPromises.mkdir(profileDir, { recursive: true });
      writeFileSync(lockFilePath, '');
      return temporaryRoot;
    });

    const { ensureProfileDirectory } = await import('../../../src/infrastructure/storage/profileDirectory.js');

    // When
    // プロファイルディレクトリの確保を実行したとき
    const result = await ensureProfileDirectory('locked-profile');

    // Then
    // ロックファイルが検出される
    expect(result.locked).toBe(true);
    expect(result.lockFilePath).toBe(lockFilePath);
  });

  test('ディレクトリが書き込み不可の場合、ConfigurationErrorを送出する', async () => {
    // Given
    // 書き込み権限がない状態を再現したプロファイルディレクトリが設定されている
    const temporaryRoot = getTemporaryRoot();
    const profileDir = join(temporaryRoot, 'profiles', 'readonly');
    const lockFilePath = join(profileDir, 'session.lock');

    const fsPromises = await import('node:fs/promises');
    await fsPromises.mkdir(profileDir, { recursive: true });
    await fsPromises.chmod(profileDir, 0o555);

    const browserProfile = await import('../../../src/domain/browserProfile.js');
    vi.spyOn(browserProfile, 'resolveProfilePaths').mockReturnValue({
      dataDirectory: profileDir,
      lockFilePath,
    });

    const userDataRoot = await import('../../../src/shared/fs/userDataRoot.js');
    vi.spyOn(userDataRoot, 'ensureUserDataRoot').mockResolvedValue(temporaryRoot);

    const { ensureProfileDirectory } = await import('../../../src/infrastructure/storage/profileDirectory.js');

    // When
    // プロファイルディレクトリの確保を実行したとき
    const act = async () => ensureProfileDirectory('readonly');

    // Then
    // 設定エラーが送出される
    await expect(act()).rejects.toMatchObject({
      exitCode: exitCodes.configurationError,
      message: expect.stringContaining('プロファイルディレクトリに書き込み権限'),
    });
  });
});
