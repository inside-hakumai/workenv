/**
 * CLI実行に関する共通定数
 */

/**
 * CLIコマンド名
 */
export const CLI_NAME = 'chrome-remote-debug';

/**
 * プロフィールデータルートディレクトリ（ホーム相対パス）
 */
export const PROFILE_ROOT_DIR = '.ih-dopen';

/**
 * ポート番号の範囲
 */
export const PORT_RANGE = {
  /** 最小ポート番号（ウェルノウンポート以上） */
  MIN: 1024,
  /** 最大ポート番号 */
  MAX: 65535,
  /** 自動割り当て時のデフォルト開始ポート */
  DEFAULT_START: 9222,
} as const;

/**
 * セッションロックファイル名
 */
export const SESSION_LOCK_FILE = 'session.lock';

/**
 * Chrome起動時のタイムアウト（ミリ秒）
 */
export const CHROME_LAUNCH_TIMEOUT_MS = 30000;

/**
 * プロファイル名のバリデーション用正規表現
 */
export const PROFILE_NAME_REGEX = /^[a-z0-9-_]+$/;

/**
 * プロファイル名の最大長
 */
export const PROFILE_NAME_MAX_LENGTH = 64;
