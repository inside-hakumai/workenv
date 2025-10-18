import { expect, test, describe } from 'vitest';
import { buildChromeArguments } from '../../../src/infrastructure/chrome/chromeArguments.js';

describe('buildChromeArguments', () => {
  test('基本的なリモートデバッグオプションが指定された場合、必須フラグを含む配列を返す', () => {
    // Given
    // リモートデバッグポート、プロファイルディレクトリ、URLが指定された状態
    const port = 9222;
    const userDataDir = '/Users/test/.ih-dopen/dev-login';
    const url = 'https://example.com';

    // When
    // Chromeフラグ配列を生成したとき
    const result = buildChromeArguments({
      port,
      userDataDir,
      url,
    });

    // Then
    // 必須フラグが含まれている
    expect(result).toContain(`--remote-debugging-port=${port}`);
    expect(result).toContain(`--user-data-dir=${userDataDir}`);
    expect(result).toContain('--no-first-run');
    expect(result).toContain(url);
  });

  test('追加フラグが指定された場合、追加フラグも含まれる', () => {
    // Given
    // 追加フラグを含むパラメータが指定された状態
    const port = 9223;
    const userDataDir = '/Users/test/.ih-dopen/qa';
    const url = 'https://staging.example.com';
    const additionalArgs = ['--headless', '--disable-gpu'];

    // When
    // Chromeフラグ配列を生成したとき
    const result = buildChromeArguments({
      port,
      userDataDir,
      url,
      additionalArgs,
    });

    // Then
    // 追加フラグも含まれている
    expect(result).toContain('--headless');
    expect(result).toContain('--disable-gpu');
    expect(result).toContain(url);
  });

  test('URLが最後の引数として配置される', () => {
    // Given
    // 各種パラメータが指定された状態
    const port = 9222;
    const userDataDir = '/Users/test/.ih-dopen/dev';
    const url = 'https://example.com';
    const additionalArgs = ['--headless'];

    // When
    // Chromeフラグ配列を生成したとき
    const result = buildChromeArguments({
      port,
      userDataDir,
      url,
      additionalArgs,
    });

    // Then
    // URLが配列の最後の要素である
    expect(result.at(-1)).toBe(url);
  });
});
