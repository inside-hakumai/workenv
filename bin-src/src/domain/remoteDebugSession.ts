/**
 * リモートデバッグセッションに関するドメイン型とヘルパー
 */

import { randomUUID } from 'node:crypto';

/**
 * セッション状態
 */
export type SessionStatus = 'launching' | 'ready' | 'failed' | 'stopped';

/**
 * リモートデバッグセッション
 */
export type RemoteDebugSession = {
  /** セッションID（UUID v4） */
  sessionId: string;
  /** プロファイル名 */
  profileName: string;
  /** ターゲットURL */
  targetUrl: string;
  /** リモートデバッグポート */
  port: number;
  /** WebSocketエンドポイント（Chrome起動後に取得） */
  wsEndpoint?: string | undefined;
  /** ChromeプロセスのPID */
  chromeProcessPid?: number | undefined;
  /** 起動日時 */
  launchedAt: Date;
  /** セッション状態 */
  status: SessionStatus;
};

/**
 * セッション構築パラメータ
 */
export type BuildSessionParameters = {
  /** プロファイル名 */
  profileName: string;
  /** ターゲットURL */
  targetUrl: string;
  /** リモートデバッグポート */
  port: number;
  /** 初期状態（デフォルト: 'launching'） */
  initialStatus?: SessionStatus;
};

/**
 * リモートデバッグセッションを構築する
 *
 * @param params - セッション構築パラメータ
 * @returns 新しいリモートデバッグセッション
 */
export function buildRemoteDebugSession(parameters: BuildSessionParameters): RemoteDebugSession {
  return {
    sessionId: randomUUID(),
    profileName: parameters.profileName,
    targetUrl: parameters.targetUrl,
    port: parameters.port,
    launchedAt: new Date(),
    status: parameters.initialStatus ?? 'launching',
  };
}
