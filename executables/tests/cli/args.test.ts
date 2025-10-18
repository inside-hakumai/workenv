import { expect, test, describe } from 'vitest';
import { parseCliArgs } from '../../src/cli/args.js';

describe('parseCliArgs', () => {
  test('URLとプロファイル名が指定された場合、パース結果を返す', () => {
    // Given
    // CLIに必須引数としてURLとプロファイル名が渡された状態
    const argv = ['--url', 'https://example.com', '--profile', 'dev-login'];

    // When
    // 引数をパースしたとき
    const result = parseCliArgs(argv);

    // Then
    // URLとプロファイル名が正しくパースされる
    expect(result.url).toBe('https://example.com');
    expect(result.profile).toBe('dev-login');
  });

  test('ポート番号が指定された場合、オプション引数も含めてパース結果を返す', () => {
    // Given
    // 必須引数とオプションのポート番号が渡された状態
    const argv = [
      '--url',
      'https://staging.example.com',
      '--profile',
      'qa-test',
      '--port',
      '9223',
    ];

    // When
    // 引数をパースしたとき
    const result = parseCliArgs(argv);

    // Then
    // ポート番号も正しくパースされる
    expect(result.url).toBe('https://staging.example.com');
    expect(result.profile).toBe('qa-test');
    expect(result.port).toBe(9223);
  });

  test('Chromeパスと追加引数が指定された場合、すべての引数がパースされる', () => {
    // Given
    // すべてのオプション引数を含む引数が渡された状態
    const argv = [
      '--url',
      'https://example.com',
      '--profile',
      'dev',
      '--port',
      '9222',
      '--chrome-path',
      '/usr/bin/google-chrome',
      '--additional-args=--disable-gpu,--no-sandbox',
    ];

    // When
    // 引数をパースしたとき
    const result = parseCliArgs(argv);

    // Then
    // すべての引数が正しくパースされる
    expect(result.url).toBe('https://example.com');
    expect(result.profile).toBe('dev');
    expect(result.port).toBe(9222);
    expect(result.chromePath).toBe('/usr/bin/google-chrome');
    expect(result.additionalArgs).toEqual(['--disable-gpu', '--no-sandbox']);
  });
});
