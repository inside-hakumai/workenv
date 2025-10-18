import meow from 'meow';

/**
 * CLI引数のパース結果
 */
export type ParsedCliArgs = {
  readonly url: string;
  readonly profile: string;
  readonly port?: number;
  readonly chromePath?: string;
  readonly additionalArgs?: readonly string[];
};

/**
 * CLI引数をパースする
 *
 * @param argv - コマンドライン引数の配列
 * @returns パースされた引数
 */
export function parseCliArgs(argv: readonly string[]): ParsedCliArgs {
  const cli = meow(
    `
    Usage
      $ chrome-remote-debug --url <url> --profile <name>

    Options
      --url <string>           必須。起動対象URL（http/httpsのみ）
      --profile <string>       必須。プロファイル識別子（小文字英数字 + -_）
      --port <number>          任意。リモートデバッグポート（1024-65535）
      --chrome-path <string>   任意。Chrome実行ファイルの絶対パス
      --additional-args <string> 任意。Chromeへ渡す追加引数（カンマ区切り）

    Examples
      $ chrome-remote-debug --url https://example.com --profile dev-login
      $ chrome-remote-debug --url https://staging.example.com --profile qa --port 9223
  `,
    {
      importMeta: import.meta,
      argv,
      flags: {
        url: {
          type: 'string',
          isRequired: true,
        },
        profile: {
          type: 'string',
          isRequired: true,
        },
        port: {
          type: 'number',
        },
        chromePath: {
          type: 'string',
        },
        additionalArgs: {
          type: 'string',
        },
      },
    },
  );

  return {
    url: cli.flags.url,
    profile: cli.flags.profile,
    ...(cli.flags.port !== undefined && { port: cli.flags.port }),
    ...(cli.flags.chromePath !== undefined && { chromePath: cli.flags.chromePath }),
    ...(cli.flags.additionalArgs !== undefined && {
      additionalArgs: cli.flags.additionalArgs.split(',').map(arg => arg.trim()),
    }),
  };
}
