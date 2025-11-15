/**
 * プロファイル管理サービス
 */

import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { ensureProfileDirectory } from '../../infrastructure/storage/profileDirectory.js';
import { ProfileLockedError } from '../../shared/errors.js';

const metadataFileName = 'profile.json';

type ProfileMetadata = {
  profileName: string;
  createdAt: string;
  lastLaunchedAt: string | undefined;
};

/**
 * プロファイル状態
 */
export type ProfileState = {
  /** プロファイル名 */
  profileName: string;
  /** データディレクトリ */
  dataDirectory: string;
  /** ロックファイルパス */
  lockFilePath: string;
  /** ロック状態（準備後は常にfalse） */
  locked: boolean;
  /** 作成日時 */
  createdAt: Date;
  /** 最終起動日時 */
  lastLaunchedAt?: Date;
};

type DirectoryState = Awaited<ReturnType<typeof ensureProfileDirectory>>;

/**
 * プロファイルの現在状態を取得する
 *
 * @param profileName - プロファイル名
 * @returns プロファイル状態
 */
export async function getProfileState(profileName: string): Promise<ProfileState> {
  const directoryState = await ensureProfileDirectory(profileName);
  const metadataPath = join(directoryState.dataDirectory, metadataFileName);
  const metadata = await loadOrCreateMetadata(metadataPath, profileName);

  return createProfileState(profileName, directoryState, metadata);
}

/**
 * プロファイルを利用可能な状態に準備する
 *
 * @param profileName - プロファイル名
 * @returns プロファイル状態
 * @throws {ProfileLockedError} ロックが検出された場合
 */
export async function prepareProfile(profileName: string): Promise<ProfileState> {
  const state = await getProfileState(profileName);

  if (state.locked) {
    throw new ProfileLockedError(
      `プロファイル "${profileName}" は既に使用中です。Chromeを終了してから再実行してください。`,
    );
  }

  return {
    ...state,
    locked: false,
  };
}

/**
 * 最終起動日時を更新し、更新後のプロファイル状態を返す
 *
 * @param profileName - プロファイル名
 * @param launchedAt - 最終起動日時
 * @returns 更新後のプロファイル状態
 * @throws {ProfileLockedError} ロックが検出された場合
 */
export async function updateLastLaunchedAt(profileName: string, launchedAt: Date): Promise<ProfileState> {
  const directoryState = await ensureProfileDirectory(profileName);

  if (directoryState.locked) {
    throw new ProfileLockedError(
      `プロファイル "${profileName}" は既に使用中です。Chromeを終了してから再実行してください。`,
    );
  }

  const metadataPath = join(directoryState.dataDirectory, metadataFileName);
  const metadata = await loadOrCreateMetadata(metadataPath, profileName);
  const updatedMetadata: ProfileMetadata = {
    ...metadata,
    lastLaunchedAt: launchedAt.toISOString(),
  };

  await writeMetadata(metadataPath, updatedMetadata);

  return {
    ...createProfileState(profileName, directoryState, updatedMetadata, false),
    lastLaunchedAt: new Date(updatedMetadata.lastLaunchedAt),
  };
}

async function loadOrCreateMetadata(path: string, profileName: string): Promise<ProfileMetadata> {
  try {
    const content = await readFile(path, 'utf8');
    const parsed = JSON.parse(content) as Partial<ProfileMetadata>;

    if (typeof parsed.createdAt === 'string' && 'lastLaunchedAt' in parsed) {
      return {
        profileName: parsed.profileName ?? profileName,
        createdAt: parsed.createdAt,
        lastLaunchedAt: parsed.lastLaunchedAt ?? null,
      };
    }
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') {
      // 破損している場合は新規作成にフォールバック
    }
  }

  const now = new Date().toISOString();
  const metadata: ProfileMetadata = {
    profileName,
    createdAt: now,
    lastLaunchedAt: null,
  };

  await writeMetadata(path, metadata);
  return metadata;
}

async function writeMetadata(path: string, metadata: ProfileMetadata): Promise<void> {
  await writeFile(path, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
}

function createProfileState(
  profileName: string,
  directoryState: DirectoryState,
  metadata: ProfileMetadata,
  lockedOverride?: boolean,
): ProfileState {
  return {
    profileName,
    dataDirectory: directoryState.dataDirectory,
    lockFilePath: directoryState.lockFilePath,
    locked: lockedOverride ?? directoryState.locked,
    createdAt: new Date(metadata.createdAt),
    ...(metadata.lastLaunchedAt ? { lastLaunchedAt: new Date(metadata.lastLaunchedAt) } : {}),
  };
}
