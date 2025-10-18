/**
 * CLI用のエラー基底クラスと派生エラー型
 */

/**
 * エラー終了コード
 */
export const exitCodes = {
  /** 成功 */
  success: 0,
  /** 一般的なエラー */
  generalError: 1,
  /** 設定エラー */
  configurationError: 2,
  /** ポート競合エラー */
  portConflict: 3,
  /** プロファイルロックエラー */
  profileLocked: 4,
  /** Chrome実行ファイル未検出 */
  chromeNotFound: 5,
  /** Chrome起動失敗 */
  chromeLaunchFailed: 6,
} as const;

/**
 * CLI用基底エラークラス
 */
export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = exitCodes.generalError,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 設定エラー（引数バリデーション、環境設定の問題など）
 */
export class ConfigurationError extends CliError {
  constructor(message: string) {
    super(message, exitCodes.configurationError);
  }
}

/**
 * ポート競合エラー
 */
export class PortConflictError extends CliError {
  constructor(
    message: string,
    public readonly suggestedPorts?: number[],
  ) {
    super(message, exitCodes.portConflict);
  }
}

/**
 * プロファイルロックエラー（既存セッション稼働中）
 */
export class ProfileLockedError extends CliError {
  constructor(message: string) {
    super(message, exitCodes.profileLocked);
  }
}

/**
 * Chrome実行ファイル未検出エラー
 */
export class ChromeNotFoundError extends CliError {
  constructor(message: string) {
    super(message, exitCodes.chromeNotFound);
  }
}

/**
 * Chrome起動失敗エラー
 */
export class ChromeLaunchError extends CliError {
  constructor(message: string) {
    super(message, exitCodes.chromeLaunchFailed);
  }
}
