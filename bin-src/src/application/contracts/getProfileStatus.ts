/**
 * プロファイル状態取得コントラクト
 */

import { getProfileState } from '../services/profileService.js';

/**
 * プロファイル状態レスポンス
 */
export type ProfileStatusResponse = {
  /** プロファイル情報 */
  profile: {
    /** プロファイル名 */
    profileName: string;
    /** ユーザーデータディレクトリ */
    dataDirectory: string;
    /** ロック状態 */
    locked: boolean;
    /** 最終起動日時（ISO 8601、存在しない場合はundefined） */
    lastLaunchedAt?: string;
  };
  /** アクティブセッション情報（Phase5実装まではundefined） */
  activeSession?: undefined;
};

/**
 * プロファイル状態を取得する
 *
 * @param profileName - プロファイル名
 * @returns プロファイル状態レスポンス
 */
export async function getProfileStatus(profileName: string): Promise<ProfileStatusResponse> {
  const state = await getProfileState(profileName);

  const lastLaunchedAt = state.lastLaunchedAt?.toISOString();

  return {
    profile: {
      profileName: state.profileName,
      dataDirectory: state.dataDirectory,
      locked: state.locked,
      ...(lastLaunchedAt ? { lastLaunchedAt } : {}),
    },
    activeSession: undefined,
  };
}
