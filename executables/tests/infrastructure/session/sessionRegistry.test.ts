/**
 * SessionRegistryのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { type RemoteDebugSession } from '../../../src/domain/remoteDebugSession.js';
import {
  registerSession,
  unregisterSession,
  findSessionByProfile,
  findSessionById,
  clearAllSessions,
} from '../../../src/infrastructure/session/sessionRegistry.js';

describe('SessionRegistry', () => {
  beforeEach(() => {
    clearAllSessions();
  });

  describe('registerSession', () => {
    it('セッションを登録できる場合、そのセッションを登録する', () => {
      // Given
      // 新しいセッションが与えられた状態
      const session: RemoteDebugSession = {
        sessionId: 'test-session-id',
        profileName: 'test-profile',
        targetUrl: 'https://example.com',
        port: 9222,
        launchedAt: new Date(),
        status: 'ready',
      };

      // When
      // registerSessionを実行したとき
      registerSession(session);

      // Then
      // セッションが登録される
      const found = findSessionById('test-session-id');
      expect(found).toEqual(session);
    });

    it('同じプロファイル名で既にセッションが登録されている場合、エラーを投げる', () => {
      // Given
      // 同じプロファイル名のセッションが既に登録されている状態
      const existingSession: RemoteDebugSession = {
        sessionId: 'existing-session-id',
        profileName: 'test-profile',
        targetUrl: 'https://example.com',
        port: 9222,
        launchedAt: new Date(),
        status: 'ready',
      };
      registerSession(existingSession);

      const newSession: RemoteDebugSession = {
        sessionId: 'new-session-id',
        profileName: 'test-profile',
        targetUrl: 'https://example.com',
        port: 9223,
        launchedAt: new Date(),
        status: 'ready',
      };

      // When
      // 同じプロファイル名で新しいセッションを登録しようとしたとき

      // Then
      // エラーが投げられる
      expect(() => {
        registerSession(newSession);
      }).toThrow('プロファイル test-profile は既に使用中です');
    });

    it('同じセッションIDで既にセッションが登録されている場合、エラーを投げる', () => {
      // Given
      // 同じセッションIDのセッションが既に登録されている状態
      const existingSession: RemoteDebugSession = {
        sessionId: 'duplicate-session-id',
        profileName: 'profile-1',
        targetUrl: 'https://example.com',
        port: 9222,
        launchedAt: new Date(),
        status: 'ready',
      };
      registerSession(existingSession);

      const newSession: RemoteDebugSession = {
        sessionId: 'duplicate-session-id',
        profileName: 'profile-2',
        targetUrl: 'https://example.com',
        port: 9223,
        launchedAt: new Date(),
        status: 'ready',
      };

      // When
      // 同じセッションIDで新しいセッションを登録しようとしたとき

      // Then
      // エラーが投げられる
      expect(() => {
        registerSession(newSession);
      }).toThrow('sessionId duplicate-session-id は既に使用中です');
    });

    it('セッションIDとプロファイル名の両方が重複している場合でもエラーを投げる', () => {
      // Given
      // 同じセッションIDとプロファイル名のセッションが既に登録されている状態
      const existingSession: RemoteDebugSession = {
        sessionId: 'same-session-id',
        profileName: 'same-profile',
        targetUrl: 'https://example.com',
        port: 9222,
        launchedAt: new Date(),
        status: 'ready',
      };
      registerSession(existingSession);

      const duplicateSession: RemoteDebugSession = {
        sessionId: 'same-session-id',
        profileName: 'same-profile',
        targetUrl: 'https://example.com',
        port: 9223,
        launchedAt: new Date(),
        status: 'ready',
      };

      // When
      // 同じセッションIDとプロファイル名で新しいセッションを登録しようとしたとき

      // Then
      // エラーが投げられる
      expect(() => {
        registerSession(duplicateSession);
      }).toThrow(/は既に使用中です/);
    });
  });

  describe('unregisterSession', () => {
    it('登録されているセッションを削除できる場合、そのセッションを削除する', () => {
      // Given
      // セッションが登録されている状態
      const session: RemoteDebugSession = {
        sessionId: 'test-session-id',
        profileName: 'test-profile',
        targetUrl: 'https://example.com',
        port: 9222,
        launchedAt: new Date(),
        status: 'ready',
      };
      registerSession(session);

      // When
      // unregisterSessionを実行したとき
      unregisterSession('test-session-id');

      // Then
      // セッションが削除される
      const found = findSessionById('test-session-id');
      expect(found).toBeUndefined();
    });
  });

  describe('findSessionByProfile', () => {
    it('指定されたプロファイル名のセッションが存在する場合、そのセッションを返す', () => {
      // Given
      // プロファイル名test-profileのセッションが登録されている状態
      const session: RemoteDebugSession = {
        sessionId: 'test-session-id',
        profileName: 'test-profile',
        targetUrl: 'https://example.com',
        port: 9222,
        launchedAt: new Date(),
        status: 'ready',
      };
      registerSession(session);

      // When
      // findSessionByProfileを実行したとき
      const found = findSessionByProfile('test-profile');

      // Then
      // セッションが返される
      expect(found).toEqual(session);
    });

    it('指定されたプロファイル名のセッションが存在しない場合、undefinedを返す', () => {
      // Given
      // セッションが登録されていない状態

      // When
      // findSessionByProfileを実行したとき
      const found = findSessionByProfile('non-existent-profile');

      // Then
      // undefinedが返される
      expect(found).toBeUndefined();
    });
  });

  describe('findSessionById', () => {
    it('指定されたセッションIDのセッションが存在する場合、そのセッションを返す', () => {
      // Given
      // セッションIDtest-session-idのセッションが登録されている状態
      const session: RemoteDebugSession = {
        sessionId: 'test-session-id',
        profileName: 'test-profile',
        targetUrl: 'https://example.com',
        port: 9222,
        launchedAt: new Date(),
        status: 'ready',
      };
      registerSession(session);

      // When
      // findSessionByIdを実行したとき
      const found = findSessionById('test-session-id');

      // Then
      // セッションが返される
      expect(found).toEqual(session);
    });

    it('指定されたセッションIDのセッションが存在しない場合、undefinedを返す', () => {
      // Given
      // セッションが登録されていない状態

      // When
      // findSessionByIdを実行したとき
      const found = findSessionById('non-existent-id');

      // Then
      // undefinedが返される
      expect(found).toBeUndefined();
    });
  });
});
