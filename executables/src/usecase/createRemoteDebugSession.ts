/**
 * リモートデバッグセッション作成ユースケース
 */

import type { ParsedCliArgs } from '../cli/args.js';
import { prepareProfile, updateLastLaunchedAt } from '../application/services/profileService.js';
import { type CreateSessionResponse, createSession } from '../application/services/remoteDebuggingService.js';
import { buildRemoteDebugSession } from '../domain/remoteDebugSession.js';
import { registerSession } from '../infrastructure/session/sessionRegistry.js';

/**
 * CLI入力からリモートデバッグセッションを作成する
 *
 * @param args - CLI引数
 * @returns セッション作成結果
 */
export async function createRemoteDebugSession(args: ParsedCliArgs): Promise<CreateSessionResponse> {
  await prepareProfile(args.profile);

  const session = await createSession({
    url: args.url,
    profileName: args.profile,
    ...(args.port !== undefined && { port: args.port }),
    ...(args.chromePath !== undefined && { chromePath: args.chromePath }),
    ...(args.additionalArgs !== undefined && { additionalArgs: args.additionalArgs }),
  });

  // セッションを登録
  const remoteDebugSession = buildRemoteDebugSession({
    profileName: args.profile,
    targetUrl: args.url,
    port: session.port,
    initialStatus: 'ready',
  });

  // SessionIdを合わせる
  const registeredSession = {
    ...remoteDebugSession,
    sessionId: session.sessionId,
    wsEndpoint: session.wsEndpoint,
    chromeProcessPid: session.chromeProcessPid,
    launchedAt: session.profile.lastLaunchedAt ?? new Date(),
  };

  registerSession(registeredSession);

  const launchedAt = session.profile.lastLaunchedAt ?? new Date();
  const updatedProfile = await updateLastLaunchedAt(args.profile, launchedAt);

  return {
    ...session,
    profile: {
      profileName: updatedProfile.profileName,
      dataDirectory: updatedProfile.dataDirectory,
      locked: updatedProfile.locked,
      lastLaunchedAt: updatedProfile.lastLaunchedAt,
    },
  };
}
