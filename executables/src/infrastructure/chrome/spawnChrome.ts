/**
 * Chrome起動とDevTools接続待機
 */

import { spawn } from 'node:child_process';
import type { RemoteDebugSession } from '../../domain/remoteDebugSession.js';
import { buildRemoteDebugSession } from '../../domain/remoteDebugSession.js';
import { ChromeLaunchError } from '../../shared/errors.js';
import { CHROME_LAUNCH_TIMEOUT_MS } from '../../shared/constants.js';

/**
 * Chrome起動パラメータ
 */
export type SpawnChromeParams = {
  /** Chrome実行ファイルの絶対パス */
  executablePath: string;
  /** Chromeに渡す引数 */
  args: string[];
  /** プロファイル名 */
  profileName: string;
  /** ターゲットURL */
  targetUrl: string;
  /** リモートデバッグポート */
  port: number;
};

/**
 * Chromeを起動し、DevToolsエンドポイントを取得する
 *
 * @param params - Chrome起動パラメータ
 * @returns リモートデバッグセッション
 */
export async function spawnChrome(params: SpawnChromeParams): Promise<RemoteDebugSession> {
  const session = buildRemoteDebugSession({
    profileName: params.profileName,
    targetUrl: params.targetUrl,
    port: params.port,
    initialStatus: 'launching',
  });

  return new Promise((resolve, reject) => {
    const chromeProcess = spawn(params.executablePath, params.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    let wsEndpoint: string | undefined;
    let timeoutId: NodeJS.Timeout | undefined;
    let settled = false;

    // イベントハンドラーへの参照を保持
    const stderrDataHandler = (data: Buffer) => {
      const output = data.toString();
      const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(output);

      if (match && match[1]) {
        wsEndpoint = match[1];

        const pid = chromeProcess.pid;
        if (pid === undefined) {
          cleanup();
          if (!settled) {
            settled = true;
            reject(new ChromeLaunchError('ChromeプロセスのPIDを取得できませんでした'));
          }
          return;
        }

        cleanup();
        if (!settled) {
          settled = true;
          resolve({
            ...session,
            wsEndpoint,
            chromeProcessPid: pid,
            status: 'ready',
          });
        }
      }
    };

    const errorHandler = (error: Error) => {
      cleanup();
      if (!settled) {
        settled = true;
        reject(new ChromeLaunchError(`Chromeプロセスの起動に失敗しました: ${error.message}`));
      }
    };

    const exitHandler = (code: number | null, signal: NodeJS.Signals | null) => {
      if (!wsEndpoint) {
        cleanup();
        if (!settled) {
          settled = true;
          reject(new ChromeLaunchError(`Chromeプロセスが予期せず終了しました（コード: ${code}, シグナル: ${signal}）`));
        }
      }
    };

    const timeoutHandler = () => {
      chromeProcess.kill();
      cleanup();
      if (!settled) {
        settled = true;
        reject(
          new ChromeLaunchError(
            `Chrome起動がタイムアウトしました（${CHROME_LAUNCH_TIMEOUT_MS}ms）。DevToolsエンドポイントの出力を確認できませんでした。`,
          ),
        );
      }
    };

    // クリーンアップ関数：すべてのリスナーとタイムアウトを削除
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      chromeProcess.stderr?.removeListener('data', stderrDataHandler);
      chromeProcess.removeListener('error', errorHandler);
      chromeProcess.removeListener('exit', exitHandler);
    };

    // タイムアウト設定
    timeoutId = setTimeout(timeoutHandler, CHROME_LAUNCH_TIMEOUT_MS);

    // イベントリスナー登録
    chromeProcess.stderr?.on('data', stderrDataHandler);
    chromeProcess.on('error', errorHandler);
    chromeProcess.on('exit', exitHandler);
  });
}
