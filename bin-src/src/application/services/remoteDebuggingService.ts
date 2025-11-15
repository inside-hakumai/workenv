/**
 * リモートデバッグセッション管理サービス
 */

import { resolveProfilePaths } from '../../domain/browserProfile.js';
import { detectChromeExecutable } from '../../infrastructure/chrome/detectChromeExecutable.js';
import { buildChromeArguments } from '../../infrastructure/chrome/chromeArguments.js';
import { spawnChrome } from '../../infrastructure/chrome/spawnChrome.js';
import { autoAllocatePort } from '../../infrastructure/ports/autoAllocatePort.js';
import { findSessionByProfile } from '../../infrastructure/session/sessionRegistry.js';
import { suggestAlternativePorts } from '../../infrastructure/ports/suggestPorts.js';

/**
 * セッション作成リクエスト
 */
export type CreateSessionRequest = {
  /** 起動対象URL */
  url: string;
  /** プロファイル名 */
  profileName: string;
  /** リモートデバッグポート（オプション） */
  port?: number;
  /** Chrome実行ファイルパス（オプション） */
  chromePath?: string;
  /** 追加引数（オプション） */
  additionalArgs?: readonly string[];
};

/**
 * プロファイル記述子
 */
export type ProfileDescriptor = {
  /** プロファイル名 */
  profileName: string;
  /** データディレクトリ */
  dataDirectory: string;
  /** ロック状態 */
  locked: boolean;
  /** 最終起動日時 */
  lastLaunchedAt: Date | undefined;
};

/**
 * セッション作成レスポンス
 */
export type CreateSessionResponse = {
  /** セッションID */
  sessionId: string;
  /** リモートデバッグポート */
  port: number;
  /** WebSocketエンドポイント */
  wsEndpoint: string;
  /** プロファイル情報 */
  profile: ProfileDescriptor;
  /** 起動時間（ミリ秒） */
  launchDurationMs?: number;
  /** ChromeプロセスPID */
  chromeProcessPid?: number;
};

/**
 * リモートデバッグセッションを作成する
 *
 * @param request - セッション作成リクエスト
 * @returns セッション作成レスポンス
 */
export async function createSession(request: CreateSessionRequest): Promise<CreateSessionResponse> {
  const startTime = Date.now();

  // 0. プロファイル競合チェック
  const existingSession = findSessionByProfile(request.profileName);
  if (existingSession) {
    throw new Error(`プロファイル ${request.profileName} は既に使用中です`);
  }

  // 1. Chrome実行ファイルのパスを検出
  const executablePath = request.chromePath ?? detectChromeExecutable();

  // 2. プロファイルパスを解決
  const { dataDirectory } = resolveProfilePaths(request.profileName);

  // 3. ポートを確保
  const portResult = await autoAllocatePort(request.port);

  if (portResult.validationOutcome !== 'available') {
    const suggestedPorts = suggestAlternativePorts(portResult.port);
    const suggestionMessage = suggestedPorts.length > 0 ? ` 推奨ポート: ${suggestedPorts.join(', ')}` : '';
    throw new Error(
      `ポート${portResult.port}は使用できません: ${portResult.errorMessage ?? '不明なエラー'}${suggestionMessage}`,
    );
  }

  // 4. Chrome引数を構築
  const args = buildChromeArguments({
    port: portResult.port,
    userDataDir: dataDirectory,
    url: request.url,
    ...(request.additionalArgs && { additionalArgs: request.additionalArgs }),
  });

  // 5. Chromeを起動
  const session = await spawnChrome({
    executablePath,
    args,
    profileName: request.profileName,
    targetUrl: request.url,
    port: portResult.port,
  });

  const endTime = Date.now();

  // 6. レスポンスを整形
  return {
    sessionId: session.sessionId,
    port: session.port,
    wsEndpoint: session.wsEndpoint ?? '',
    profile: {
      profileName: request.profileName,
      dataDirectory,
      locked: true,
      lastLaunchedAt: session.launchedAt,
    },
    launchDurationMs: endTime - startTime,
    ...(session.chromeProcessPid !== undefined && { chromeProcessPid: session.chromeProcessPid }),
  };
}
