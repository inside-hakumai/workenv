import { homedir } from 'node:os';
import { access, mkdir, constants as fsConstants } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  ensureWorktreeBaseDir,
  buildWorktreeTargetPath,
} from '../../../src/infrastructure/worktree/worktreeDirectoryManager.js';
import { ConfigurationError } from '../../../src/shared/errors.js';

vi.mock('node:os', () => ({
  homedir: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  access: vi.fn(),
  constants: { W_OK: 2 },
}));

const homedirMock = vi.mocked(homedir);
const mkdirMock = vi.mocked(mkdir);
const accessMock = vi.mocked(access);

describe('worktreeDirectoryManager', () => {
  beforeEach(() => {
    homedirMock.mockReturnValue('/home/tester');
    mkdirMock.mockReset();
    mkdirMock.mockResolvedValue(undefined);
    accessMock.mockReset();
    accessMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('worktreeベースディレクトリが未作成の場合、作成後に書き込み確認を行う', async () => {
    // Given
    // 利用者のホームディレクトリにworktree用フォルダが存在しない状態
    const expectedPath = '/home/tester/.git-worktree-manager';

    // When
    // ベースディレクトリの確保を実行したとき
    const basePath = await ensureWorktreeBaseDir();

    // Then
    // 作成したパスが返り、mkdirとaccessが正しい引数で呼ばれる
    const mkdirArgs = mkdirMock.mock.calls[0];
    const accessArgs = accessMock.mock.calls[0];
    expect({
      basePath,
      mkdirArgs,
      accessArgs,
    }).toStrictEqual({
      basePath: expectedPath,
      mkdirArgs: [expectedPath, { recursive: true }],
      accessArgs: [expectedPath, fsConstants.W_OK],
    });
  });

  test('worktreeベースディレクトリの作成に失敗した場合、構成エラーを投げる', async () => {
    // Given
    // ファイルシステムが満杯でworktreeフォルダを作成できない状態
    mkdirMock.mockRejectedValueOnce(new Error('disk full'));

    // When
    // ベースディレクトリの確保を実行したとき
    const ensure = ensureWorktreeBaseDir();

    // Then
    // 作成失敗を示す構成エラーが発生し、書き込み確認まで進まない
    await expect(ensure).rejects.toThrow(ConfigurationError);
    expect(accessMock).not.toHaveBeenCalled();
  });

  test('worktreeベースディレクトリに書き込めない場合、構成エラーを投げる', async () => {
    // Given
    // ディレクトリは作成できるが、権限不足で書き込めない状態
    accessMock.mockRejectedValueOnce(new Error('permission denied'));

    // When
    // ベースディレクトリの確保を実行したとき
    const ensure = ensureWorktreeBaseDir();

    // Then
    // 書き込み不可を示す構成エラーが発生する
    await expect(ensure).rejects.toThrow(ConfigurationError);
  });

  test('リポジトリ名に空白が含まれる場合でも、サニタイズしてパスを生成する', () => {
    // Given
    // リポジトリ名に空白が含まれ、サニタイズ済みブランチ名が提供されている状態
    const repoName = 'repo name with spaces';
    const sanitizedBranch = 'feature_login';

    // When
    // ターゲットパスの構築を実行したとき
    const targetPath = buildWorktreeTargetPath(repoName, sanitizedBranch);

    // Then
    // サニタイズされたフォルダ名でworktreeパスが返る
    expect(targetPath).toBe('/home/tester/.git-worktree-manager/repo_name_with_spaces_feature_login');
  });

  test('リポジトリ名が無効文字のみの場合、構成エラーを投げる', () => {
    // Given
    // リポジトリ名に英数字が一切含まれない状態
    const repoName = '???';

    // When
    // ターゲットパスの構築を実行したとき
    const buildPath = () => buildWorktreeTargetPath(repoName, 'feature_login');

    // Then
    // 無効なリポジトリ名を示す構成エラーが発生する
    expect(buildPath).toThrow(ConfigurationError);
  });
});
