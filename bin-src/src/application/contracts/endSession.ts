/**
 * セッション終了契約
 */

import { findSessionById, unregisterSession } from '../../infrastructure/session/sessionRegistry.js';

/**
 * セッション終了結果
 */
export type EndSessionResult = {
  /** 成功フラグ */
  success: boolean;
};

/**
 * セッションを終了する
 *
 * @param sessionId - 終了するセッションID
 * @returns セッション終了結果
 * @throws セッションが見つからない場合
 */
export async function endSession(sessionId: string): Promise<EndSessionResult> {
  const session = findSessionById(sessionId);

  if (!session) {
    throw new Error('セッションが見つかりません');
  }

  unregisterSession(sessionId);

  return {
    success: true,
  };
}
