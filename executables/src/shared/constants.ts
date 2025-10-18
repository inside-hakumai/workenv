/**
 * CLI実行に関する共通定数
 */

/**
 * CLIコマンド名
 */
export const cliName = 'chrome-remote-debug';

/**
 * プロフィールデータルートディレクトリ（ホーム相対パス）
 */
export const profileRootDir = '.ih-dopen';

/**
 * ポート番号の範囲
 */
export const portRange = {
  /** 最小ポート番号（ウェルノウンポート以上） */
  min: 1024,
  /** 最大ポート番号 */
  max: 65_535,
  /** 自動割り当て時のデフォルト開始ポート */
  defaultStart: 9222,
} as const;

/**
 * セッションロックファイル名
 */
export const sessionLockFile = 'session.lock';

/**
 * Chrome起動時のタイムアウト（ミリ秒）
 */
export const chromeLaunchTimeoutMs = 30_000;

/**
 * プロファイル名のバリデーション用正規表現
 */
export const profileNameRegex = /^[a-z\d-_]+$/;

/**
 * プロファイル名の最大長
 */
export const profileNameMaxLength = 64;
