/**
 * ポート候補生成のテスト
 */

import { describe, it, expect } from 'vitest';
import { suggestAlternativePorts } from '../../../src/infrastructure/ports/suggestPorts.js';

describe('suggestAlternativePorts', () => {
  it('通常のポート範囲の場合、指定ポートの次の3つのポートを候補として返す', () => {
    // Given
    // ポート9222が競合している状態
    const conflictedPort = 9222;

    // When
    // 代替ポート候補を生成したとき
    const suggestions = suggestAlternativePorts(conflictedPort);

    // Then
    // 9223, 9224, 9225 が候補として返される
    expect(suggestions).toEqual([9223, 9224, 9225]);
  });

  it('ポートが上限に近い場合、65535を超えない範囲で候補を返す', () => {
    // Given
    // ポート65534が競合している状態
    const conflictedPort = 65_534;

    // When
    // 代替ポート候補を生成したとき
    const suggestions = suggestAlternativePorts(conflictedPort);

    // Then
    // 65535のみが候補として返される（65536以降は範囲外）
    expect(suggestions).toEqual([65_535]);
  });

  it('ポートが上限の場合、候補を返さない', () => {
    // Given
    // ポート65535が競合している状態
    const conflictedPort = 65_535;

    // When
    // 代替ポート候補を生成したとき
    const suggestions = suggestAlternativePorts(conflictedPort);

    // Then
    // 候補が返されない
    expect(suggestions).toEqual([]);
  });

  it('候補の最大数は3つである', () => {
    // Given
    // 通常のポートが競合している状態
    const conflictedPort = 5000;

    // When
    // 代替ポート候補を生成したとき
    const suggestions = suggestAlternativePorts(conflictedPort);

    // Then
    // 候補は最大3つまで
    expect(suggestions).toHaveLength(3);
    expect(suggestions).toEqual([5001, 5002, 5003]);
  });
});
