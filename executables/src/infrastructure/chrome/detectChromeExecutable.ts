/**
 * Chrome実行ファイルの検出ロジック
 */

import { accessSync, constants as fsConstants } from 'node:fs';
import { execSync } from 'node:child_process';
import { ChromeNotFoundError } from '../../shared/errors.js';

/**
 * プラットフォーム別のChrome既定パス
 */
const DEFAULT_CHROME_PATHS: Record<string, string[]> = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  linux: [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ],
};

/**
 * ファイルが実行可能かを確認する
 *
 * @param path - 確認対象のパス
 * @returns 実行可能な場合はtrue
 */
function isExecutable(path: string): boolean {
  try {
    accessSync(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * whichコマンドでChrome実行ファイルを探す
 *
 * @returns 見つかったパス、見つからない場合はnull
 */
function findChromeViaWhich(): string | null {
  const commands = ['google-chrome-stable', 'google-chrome', 'chromium-browser', 'chromium'];

  for (const command of commands) {
    try {
      const result = execSync(`which ${command}`, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const path = result.trim();
      if (path && isExecutable(path)) {
        return path;
      }
    } catch {
      // whichが失敗した場合は次のコマンドを試す
      continue;
    }
  }

  return null;
}

/**
 * Chrome実行ファイルのパスを検出する
 *
 * 優先順位:
 * 1. CHROME_PATH環境変数
 * 2. プラットフォーム別の既定パス
 * 3. whichコマンドによる検索
 *
 * @returns Chrome実行ファイルの絶対パス
 * @throws {ChromeNotFoundError} Chrome実行ファイルが見つからない場合
 */
export function detectChromeExecutable(): string {
  // 1. CHROME_PATH環境変数をチェック
  const chromePathEnv = process.env['CHROME_PATH'];
  if (chromePathEnv) {
    if (isExecutable(chromePathEnv)) {
      return chromePathEnv;
    }
    throw new ChromeNotFoundError(`CHROME_PATH環境変数で指定されたパスが実行可能ではありません: ${chromePathEnv}`);
  }

  // 2. プラットフォーム別の既定パスを探索
  const platform = process.platform;
  const defaultPaths = DEFAULT_CHROME_PATHS[platform] ?? [];

  for (const path of defaultPaths) {
    if (isExecutable(path)) {
      return path;
    }
  }

  // 3. whichコマンドで探す（主にLinux用）
  if (platform === 'linux') {
    const whichResult = findChromeViaWhich();
    if (whichResult) {
      return whichResult;
    }
  }

  // 見つからない場合はエラー
  throw new ChromeNotFoundError(
    'Chrome実行ファイルが見つかりません。CHROME_PATH環境変数を設定するか、--chrome-pathオプションで指定してください。',
  );
}
