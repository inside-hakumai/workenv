/**
 * セッション終了契約のテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { RemoteDebugSession } from '../../../src/domain/remoteDebugSession.js';
import { endSession } from '../../../src/application/contracts/endSession.js';
import { clearAllSessions } from '../../../src/infrastructure/session/sessionRegistry.js';

describe('endSession', () => {
  beforeEach(() => {
    clearAllSessions();
  });

  it('セッションIDが登録されている場合、そのセッションを削除して成功を返す', async () => {
    // Given
    // セッションIDが登録されている状態
    const sessionId = 'test-session-id';
    const session: RemoteDebugSession = {
      sessionId,
      profileName: 'test-profile',
      targetUrl: 'https://example.com',
      port: 9222,
      launchedAt: new Date(),
      status: 'ready',
    };

    const { registerSession, findSessionById } = await import('../../../src/infrastructure/session/sessionRegistry.js');
    registerSession(session);

    // When
    // endSessionを実行したとき
    const result = await endSession(sessionId);

    // Then
    // セッションが削除され、成功が返される
    expect(result.success).toBe(true);
    expect(findSessionById(sessionId)).toBeUndefined();
  });

  it('セッションIDが登録されていない場合、エラーを投げる', async () => {
    // Given
    // セッションIDが登録されていない状態
    const sessionId = 'non-existent-session-id';

    // When
    // endSessionを実行したとき

    // Then
    // 404エラーが投げられる
    await expect(endSession(sessionId)).rejects.toThrow('セッションが見つかりません');
  });
});
