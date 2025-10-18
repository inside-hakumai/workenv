/**
 * CLI用のエラー基底クラスと派生エラー型
 */

/**
 * エラー終了コード
 */
export const EXIT_CODES = {
  /** 成功 */
  SUCCESS: 0,
  /** 一般的なエラー */
  GENERAL_ERROR: 1,
  /** 設定エラー */
  CONFIGURATION_ERROR: 2,
  /** ポート競合エラー */
  PORT_CONFLICT: 3,
  /** プロファイルロックエラー */
  PROFILE_LOCKED: 4,
  /** Chrome実行ファイル未検出 */
  CHROME_NOT_FOUND: 5,
  /** Chrome起動失敗 */
  CHROME_LAUNCH_FAILED: 6,
} as const;

/**
 * CLI用基底エラークラス
 */
export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = EXIT_CODES.GENERAL_ERROR,
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
    super(message, EXIT_CODES.CONFIGURATION_ERROR);
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
    super(message, EXIT_CODES.PORT_CONFLICT);
  }
}

/**
 * プロファイルロックエラー（既存セッション稼働中）
 */
export class ProfileLockedError extends CliError {
  constructor(message: string) {
    super(message, EXIT_CODES.PROFILE_LOCKED);
  }
}

/**
 * Chrome実行ファイル未検出エラー
 */
export class ChromeNotFoundError extends CliError {
  constructor(message: string) {
    super(message, EXIT_CODES.CHROME_NOT_FOUND);
  }
}

/**
 * Chrome起動失敗エラー
 */
export class ChromeLaunchError extends CliError {
  constructor(message: string) {
    super(message, EXIT_CODES.CHROME_LAUNCH_FAILED);
  }
}
