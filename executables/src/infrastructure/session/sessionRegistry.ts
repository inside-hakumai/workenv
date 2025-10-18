/**
 * アクティブセッション/プロファイルロック追跡
 */

import type { RemoteDebugSession } from '../../domain/remoteDebugSession.js';

/**
 * セッションIDをキーとしたセッションマップ
 */
const sessionsByIdMap = new Map<string, RemoteDebugSession>();

/**
 * プロファイル名をキーとしたセッションマップ
 */
const sessionsByProfileMap = new Map<string, RemoteDebugSession>();

/**
 * セッションを登録する
 *
 * @param session - 登録するセッション
 * @throws 同じセッションIDまたはプロファイル名で既にセッションが登録されている場合
 */
export function registerSession(session: RemoteDebugSession): void {
  const existingSessionById = sessionsByIdMap.get(session.sessionId);

  if (existingSessionById) {
    throw new Error(`sessionId ${session.sessionId} は既に使用中です`);
  }

  const existingSessionByProfile = sessionsByProfileMap.get(session.profileName);

  if (existingSessionByProfile) {
    throw new Error(`プロファイル ${session.profileName} は既に使用中です`);
  }

  sessionsByIdMap.set(session.sessionId, session);
  sessionsByProfileMap.set(session.profileName, session);
}

/**
 * セッションを登録解除する
 *
 * @param sessionId - 登録解除するセッションID
 */
export function unregisterSession(sessionId: string): void {
  const session = sessionsByIdMap.get(sessionId);

  if (session) {
    sessionsByIdMap.delete(sessionId);
    sessionsByProfileMap.delete(session.profileName);
  }
}

/**
 * プロファイル名でセッションを検索する
 *
 * @param profileName - プロファイル名
 * @returns セッション（存在しない場合はundefined）
 */
export function findSessionByProfile(profileName: string): RemoteDebugSession | undefined {
  return sessionsByProfileMap.get(profileName);
}

/**
 * セッションIDでセッションを検索する
 *
 * @param sessionId - セッションID
 * @returns セッション（存在しない場合はundefined）
 */
export function findSessionById(sessionId: string): RemoteDebugSession | undefined {
  return sessionsByIdMap.get(sessionId);
}

/**
 * すべてのセッションをクリアする（テスト用）
 */
export function clearAllSessions(): void {
  sessionsByIdMap.clear();
  sessionsByProfileMap.clear();
}
