import { describe, expect, test } from 'vitest';
import { sanitizeBranchName } from '../../src/domain/branchNameSanitizer.js';
import { ConfigurationError } from '../../src/shared/errors.js';

describe('sanitizeBranchName', () => {
  test('無効文字をアンダースコアへ置換しつつオリジナル名も保持する', () => {
    // Given
    // スラッシュやコロン、空白などファイルシステムで利用できない文字が含まれるブランチ
    const rawBranch = 'feature/login:QA fix';

    // When
    // ブランチ名をサニタイズしたとき
    const result = sanitizeBranchName(rawBranch);

    // Then
    // 無効文字がアンダースコアへ置換され、オリジナル名も保持される
    expect(result).toEqual({
      original: rawBranch,
      sanitized: 'feature_login_QA_fix',
    });
  });

  test('連続する無効文字列は単一のアンダースコアへ集約される', () => {
    // Given
    // 連続するスラッシュやアスタリスクを含むブランチ
    const rawBranch = 'bugfix///QA***123';

    // When
    const result = sanitizeBranchName(rawBranch);

    // Then
    expect(result.sanitized).toBe('bugfix_QA_123');
  });

  test('既に安全なブランチ名は変更せずに返す', () => {
    // Given
    const rawBranch = 'hotfix-QA_123';

    // When
    const result = sanitizeBranchName(rawBranch);

    // Then
    expect(result.sanitized).toBe(rawBranch);
  });

  test('サニタイズ結果が空文字になる場合は構成エラーを投げる', () => {
    // Given
    const rawBranch = '???';

    // When / Then
    expect(() => sanitizeBranchName(rawBranch)).toThrow(ConfigurationError);
  });

  test('アンダースコアのみになる場合も構成エラーとして拒否する', () => {
    // Given
    const rawBranch = '   / /  ';

    // When / Then
    expect(() => sanitizeBranchName(rawBranch)).toThrow(ConfigurationError);
  });
});
