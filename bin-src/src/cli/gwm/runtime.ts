import { CliError, exitCodes } from '../../shared/errors.js';

const fallbackErrorMessage = '予期せぬエラーが発生しました';

/**
 * CLI終了時に実行されるレポーター
 */
export type FailureReporter = {
  /** 標準エラーなどへの出力処理 */
  readonly logError: (message: string) => void;
  /** 終了コードの設定処理 */
  readonly setExitCode: (code: number) => void;
};

/**
 * 重大なエラーを処理し、ログ出力と終了コード設定を統一する
 *
 * @param error - 捕捉したエラー
 * @param reporter - 終了処理を担当するレポーター
 */
export function handleCliFailure(error: unknown, reporter: FailureReporter): void {
  if (error instanceof CliError) {
    reporter.logError(error.message);
    reporter.setExitCode(error.exitCode);
    return;
  }

  if (error instanceof Error) {
    reporter.logError(error.message);
    reporter.setExitCode(exitCodes.generalError);
    return;
  }

  reporter.logError(fallbackErrorMessage);
  reporter.setExitCode(exitCodes.generalError);
}

const terminationSignals: readonly NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

const signalNumbers: Partial<Record<NodeJS.Signals, number>> = {
  SIGINT: 2,
  SIGTERM: 15,
};

/**
 * シグナルに対応するPOSIX終了コードを求める
 *
 * @param signal - 捕捉したシグナル
 * @returns 128 + シグナル番号。未知のシグナルは一般エラー扱い
 */
export function deriveSignalExitCode(signal: NodeJS.Signals): number {
  const number = signalNumbers[signal];
  if (number === undefined) {
    return exitCodes.generalError;
  }

  return 128 + number;
}

/**
 * シグナル発火時に共通処理を実行するためのハンドラー登録関数
 *
 * @param register - シグナルごとの登録関数（`process.once`などを想定）
 * @param onTerminate - シグナル捕捉時に実行する処理
 */
export function registerTerminationHandlers(
  register: (signal: NodeJS.Signals, handler: () => void) => void,
  onTerminate: (signal: NodeJS.Signals) => void,
): void {
  for (const signal of terminationSignals) {
    register(signal, () => {
      onTerminate(signal);
    });
  }
}
