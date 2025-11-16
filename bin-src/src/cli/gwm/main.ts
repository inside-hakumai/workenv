import process, { argv as processArgv, exit as processExit, stderr as processStderr } from 'node:process';
import { render } from 'ink';
import meow from 'meow';
import { createElement } from 'react';
import GwmApp from '../../ui/gwm/App.js';
import { exitCodes } from '../../shared/errors.js';
import { parseBranchInput } from './args.js';
import {
  deriveSignalExitCode,
  handleCliFailure,
  registerTerminationHandlers,
  type FailureReporter,
} from './runtime.js';

const usageText = `
  Usage
    $ gwm <branch>

  Examples
    $ gwm feature/login
    $ gwm bugfix/QA-1234
`;

type InkRenderer = typeof render;
type MeowFactory = typeof meow;
type BranchInputParser = typeof parseBranchInput;
type TerminationRegistrar = typeof registerTerminationHandlers;
type CliFailureHandler = typeof handleCliFailure;

type RunGwmCliDependencies = {
  /** CLIへ渡すargv */
  readonly argv?: readonly string[];
  /** CLI解析に使用するmeow実装 */
  readonly meow?: MeowFactory;
  /** Ink描画関数 */
  readonly render?: InkRenderer;
  /** ブランチ解析ロジック */
  readonly parseBranchInput?: BranchInputParser;
  /** 終了シグナル監視ロジック */
  readonly registerTerminationHandlers?: TerminationRegistrar;
  /** 失敗処理ロジック */
  readonly handleCliFailure?: CliFailureHandler;
  /** 標準エラー出力への書き込み関数 */
  readonly stderrWriter?: (message: string) => void;
  /** 終了コード設定関数 */
  readonly setExitCode?: (code: number) => void;
  /** シグナル監視に使用するlistener登録 */
  readonly onSignal?: (signal: NodeJS.Signals, handler: () => void) => void;
  /** プロセス終了関数 */
  readonly exit?: (code?: number) => void;
};

/**
 * `gwm` CLIの初期化からInkアプリの実行までを統括する
 *
 * @param deps - テストダブル差し替え用の依存オーバーライド
 */
export async function runGwmCli(deps: RunGwmCliDependencies = {}): Promise<void> {
  const {
    argv = processArgv.slice(2),
    meow: meowImpl = meow,
    render: renderImpl = render,
    parseBranchInput: parseBranchInputImpl = parseBranchInput,
    registerTerminationHandlers: registerTerminationHandlersImpl = registerTerminationHandlers,
    handleCliFailure: handleCliFailureImpl = handleCliFailure,
    stderrWriter = (message: string) => {
      processStderr.write(message);
    },
    setExitCode = (code: number) => {
      process.exitCode = code;
    },
    onSignal = (signal, handler) => {
      process.once(signal, handler);
    },
    exit: exitImpl = processExit,
  } = deps;

  const cli = meowImpl(usageText, {
    importMeta: import.meta,
    argv,
    allowUnknownFlags: false,
  });

  const reporter: FailureReporter = {
    logError(message) {
      stderrWriter(`${message}\n`);
    },
    setExitCode(code) {
      setExitCode(code);
    },
  };

  try {
    const { branch } = parseBranchInputImpl({
      input: cli.input,
      showHelp(exitCode) {
        stderrWriter(`${cli.help.trim()}\n`);
        setExitCode(exitCode ?? exitCodes.configurationError);
      },
    });

    const inkInstance = renderImpl(createElement(GwmApp, { branch }));

    registerTerminationHandlersImpl(onSignal, signal => {
      inkInstance.unmount();
      exitImpl(deriveSignalExitCode(signal));
    });

    await inkInstance.waitUntilExit();
  } catch (error) {
    handleCliFailureImpl(error, reporter);
  }
}
