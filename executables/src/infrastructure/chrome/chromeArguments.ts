/**
 * ChromeLaunchOptionsからChromeフラグ配列を生成する
 */

/**
 * Chromeフラグ生成のパラメータ
 */
export type ChromeArgumentsParams = {
  /** リモートデバッグポート */
  port: number;
  /** ユーザーデータディレクトリ */
  userDataDir: string;
  /** 起動URL */
  url: string;
  /** 追加フラグ（オプション） */
  additionalArgs?: readonly string[];
};

/**
 * ChromeArgumentsParamsからChromeに渡すフラグ配列を生成する
 *
 * @param params - Chromeフラグ生成パラメータ
 * @returns Chromeフラグの配列
 */
export function buildChromeArguments(params: ChromeArgumentsParams): string[] {
  const { port, userDataDir, url, additionalArgs = [] } = params;

  return [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    ...additionalArgs,
    url,
  ];
}
