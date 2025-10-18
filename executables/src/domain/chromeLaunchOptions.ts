/**
 * Chrome起動オプションに関するドメイン型とフラグ生成ロジック
 */

/**
 * Chrome起動オプション
 */
export type ChromeLaunchOptions = {
  /** Chrome実行ファイルの絶対パス */
  executablePath: string;
  /** Chromeに渡すフラグ */
  flags: string[];
  /** プロセスを切り離すか */
  detached: boolean;
  /** 環境変数 */
  env?: Record<string, string>;
};

/**
 * 安全なChromeフラグのホワイトリスト
 * セキュリティリスクのあるフラグを除外する
 */
const SAFE_FLAG_WHITELIST = new Set([
  // ウィンドウ・表示関連
  '--window-size',
  '--window-position',
  '--start-maximized',
  '--start-fullscreen',
  '--kiosk',
  '--headless',
  '--disable-gpu',
  // デバッグ・開発関連
  '--enable-logging',
  '--v',
  '--vmodule',
  // ネットワーク関連（安全なもののみ）
  '--proxy-server',
  '--proxy-bypass-list',
  // パフォーマンス関連
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-sync',
  '--metrics-recording-only',
  // その他の安全なフラグ
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-default-apps',
  '--disable-component-update',
]);

/**
 * 危険なフラグのブラックリスト
 * セキュリティリスクがあるため拒否する
 */
const DANGEROUS_FLAG_BLACKLIST = new Set([
  '--disable-web-security',
  '--allow-running-insecure-content',
  '--unsafely-treat-insecure-origin-as-secure',
  '--disable-features=IsolateOrigins,site-per-process',
]);

/**
 * フラグ名を抽出する（値を除く）
 *
 * @param flag - フラグ文字列（例: '--window-size=800,600'）
 * @returns フラグ名（例: '--window-size'）
 */
function extractFlagName(flag: string): string {
  const equalIndex = flag.indexOf('=');
  return equalIndex === -1 ? flag : flag.slice(0, equalIndex);
}

/**
 * 追加フラグをフィルタリングして安全なフラグのみを返す
 *
 * @param additionalArgs - ユーザーが指定した追加フラグ
 * @returns フィルタリング結果
 */
export function filterSafeFlags(additionalArgs: string[]): {
  allowed: string[];
  rejected: string[];
} {
  const allowed: string[] = [];
  const rejected: string[] = [];

  for (const flag of additionalArgs) {
    const flagName = extractFlagName(flag);

    // ブラックリストチェック
    if (DANGEROUS_FLAG_BLACKLIST.has(flagName)) {
      rejected.push(flag);
      continue;
    }

    // ホワイトリストチェック
    if (SAFE_FLAG_WHITELIST.has(flagName)) {
      allowed.push(flag);
    } else {
      rejected.push(flag);
    }
  }

  return { allowed, rejected };
}
