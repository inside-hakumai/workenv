import React from 'react';
import { describe, expect, test, afterEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import ProfileSummary from '../../../src/ui/components/ProfileSummary.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ProfileSummary', () => {
  test('前回起動日時が存在する場合、状態復元が行われる旨を表示する', () => {
    // Given
    // 前回起動日時付きのプロファイル情報が与えられた状態
    const lastLaunchedAt = new Date('2024-06-01T09:00:00Z');
    const { lastFrame } = render(
      <ProfileSummary
        profile={{
          profileName: 'dev',
          dataDirectory: '/tmp/dev',
          locked: false,
          lastLaunchedAt,
        }}
      />,
    );

    // When
    // コンポーネントを描画したとき
    const output = lastFrame() ?? '';

    // Then
    // プロファイルディレクトリと復元メッセージが表示される
    expect(output).toContain('/tmp/dev');
    expect(output).toContain('状態復元: 前回起動 2024-06-01T09:00:00.000Z のデータを再利用します');
  });

  test('前回起動日時が存在しない場合、新規プロファイル作成のメッセージを表示する', () => {
    // Given
    // 初回起動のプロファイル情報が与えられた状態
    const { lastFrame } = render(
      <ProfileSummary
        profile={{
          profileName: 'fresh',
          dataDirectory: '/tmp/fresh',
          locked: false,
        }}
      />,
    );

    // When
    // コンポーネントを描画したとき
    const output = lastFrame() ?? '';

    // Then
    // 新規作成メッセージが表示される
    expect(output).toContain('/tmp/fresh');
    expect(output).toContain('状態復元: 初回起動のため新しいユーザーデータを作成します');
  });
});
