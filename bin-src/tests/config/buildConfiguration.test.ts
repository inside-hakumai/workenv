import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

type PackageJson = {
  readonly bin?: Record<string, string>;
  readonly scripts?: Record<string, string>;
};

/**
 * Tsdown設定を動的に読み込む
 *
 * @returns 読み込んだtsdown設定
 */
const loadTsdownConfig = async (): Promise<unknown> => {
  const module = await import(new URL('../../tsdown.config.ts', import.meta.url).href);
  return module.default;
};

/**
 * Tsdown設定からエントリマップを抽出する
 *
 * @param config - 読み込み対象のtsdown設定
 * @returns エントリ名をキーに持つマップ
 */
const extractEntryMap = (config: unknown): Record<string, string> => {
  if (typeof config !== 'object' || config === null) {
    throw new Error('tsdown設定を正しく読み取れませんでした');
  }

  const candidate = config as { readonly entry?: Record<string, string> };

  if (candidate.entry === undefined) {
    throw new Error('エントリ設定が存在しません');
  }

  return candidate.entry;
};

/**
 * Package.jsonを読み込んでパース結果を返す
 *
 * @returns package.jsonの内容
 */
const readPackageJson = async (): Promise<PackageJson> => {
  const file = await readFile(new URL('../../package.json', import.meta.url), 'utf8');
  return JSON.parse(file) as PackageJson;
};

describe('ビルド構成', () => {
  test('tsdown設定にgwmエントリを登録する', async () => {
    // Given
    // tsdown設定に登録されたエントリ情報
    const config = await loadTsdownConfig();
    const entryMap = extractEntryMap(config);

    // When
    // gwmエントリの入力パスを取得したとき
    const gwmEntry = entryMap['gwm'];

    // Then
    // gwmエントリがgwm CLIのソースを指している
    expect(gwmEntry).toBe('./src/cli/gwm.ts');
  });

  test('package.jsonのbinにgwmコマンドを登録する', async () => {
    // Given
    // package.json全体
    const packageJson = await readPackageJson();

    // When
    // binマッピングからgwmエントリを取得したとき
    const gwmBin = packageJson.bin?.['gwm'];

    // Then
    // gmw実行ファイルがdist/gwmを指している
    expect(gwmBin).toBe('dist/gwm');
  });

  test('配布スクリプトでgwmバイナリをコピーする', async () => {
    // Given
    const packageJson = await readPackageJson();

    // When
    const distributeScript = packageJson.scripts?.['distribute'] ?? '';

    // Then
    expect(distributeScript).toContain('dist/gwm');
    expect(distributeScript).toContain('../dist/bin/gwm');
  });
});
