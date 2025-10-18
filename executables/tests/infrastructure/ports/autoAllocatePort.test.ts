import { expect, test, describe } from 'vitest';
import { autoAllocatePort } from '../../../src/infrastructure/ports/autoAllocatePort.js';

describe('autoAllocatePort', () => {
  test('ユーザー指定ポートがない場合、自動的に空きポートを割り当てる', async () => {
    // Given
    // ポートが指定されていない状態
    const userPort = undefined;

    // When
    // ポート自動割り当てを実行したとき
    const result = await autoAllocatePort(userPort);

    // Then
    // 有効な範囲のポートが割り当てられ、利用可能である
    expect(result.port).toBeGreaterThanOrEqual(1024);
    expect(result.port).toBeLessThanOrEqual(65535);
    expect(result.requestedByUser).toBe(false);
    expect(result.validationOutcome).toBe('available');
  });

  test('ユーザー指定ポートがある場合、そのポートの可用性をチェックする', async () => {
    // Given
    // ユーザーがポート番号を指定した状態（おそらく利用可能なポート）
    const userPort = 19222; // 通常は使用されていないポート

    // When
    // ポート検証を実行したとき
    const result = await autoAllocatePort(userPort);

    // Then
    // 指定されたポートで検証が行われる
    expect(result.port).toBe(userPort);
    expect(result.requestedByUser).toBe(true);
    // 利用可能かどうかは環境依存のため、outcomeが設定されていることのみ確認
    expect(['available', 'occupied', 'error']).toContain(result.validationOutcome);
  });
});
