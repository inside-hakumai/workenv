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
  wsEndpoint?: string;
  /** ChromeプロセスのPID */
  chromeProcessPid?: number;
  /** 起動日時 */
  launchedAt: Date;
  /** セッション状態 */
  status: SessionStatus;
};

/**
 * セッション構築パラメータ
 */
export type BuildSessionParams = {
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
export function buildRemoteDebugSession(params: BuildSessionParams): RemoteDebugSession {
  return {
    sessionId: randomUUID(),
    profileName: params.profileName,
    targetUrl: params.targetUrl,
    port: params.port,
    launchedAt: new Date(),
    status: params.initialStatus ?? 'launching',
  };
}
