/**
 * ChromeLaunchOptionsからChromeフラグ配列を生成する
 */

/**
 * Chromeフラグ生成のパラメータ
 */
export type ChromeArgumentsParameters = {
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
 * ChromeArgumentsParametersからChromeに渡すフラグ配列を生成する
 *
 * @param params - Chromeフラグ生成パラメータ
 * @returns Chromeフラグの配列
 */
export function buildChromeArguments(parameters: ChromeArgumentsParameters): string[] {
  const { port, userDataDir, url, additionalArgs = [] } = parameters;

  return [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    ...additionalArgs,
    url,
  ];
}
