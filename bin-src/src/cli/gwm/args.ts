import { ConfigurationError, exitCodes } from '../../shared/errors.js';

/**
 * `gwm` CLIで受け付ける引数
 */
export type BranchCliArgs = {
  /** ユーザーが指定したブランチ名 */
  readonly branch: string;
};

/**
 * 引数解析に必要な最低限のCLI情報
 */
type CliInputSource = {
  /** 位置引数の配列 */
  readonly input: readonly string[];
  /** ヘルプ表示処理 */
  readonly showHelp: (exitCode?: number) => void;
};

/**
 * `gwm <branch>`形式で渡された引数を検証し、ブランチ名を取得する
 *
 * @param cli - `meow`が返すCLI情報
 * @returns 正常化済みのブランチ名
 * @throws ConfigurationError ブランチ数が1件でない、もしくは空白のみの場合
 */
export function parseBranchInput(cli: CliInputSource): BranchCliArgs {
  if (cli.input.length !== 1) {
    cli.showHelp(exitCodes.configurationError);
    throw new ConfigurationError('ブランチ名を1つだけ指定してください。');
  }

  const [rawBranch] = cli.input;
  const normalizedBranch = rawBranch?.trim() ?? '';

  if (normalizedBranch.length === 0) {
    throw new ConfigurationError('ブランチ名は空白以外の文字で指定してください。');
  }

  return { branch: normalizedBranch };
}
