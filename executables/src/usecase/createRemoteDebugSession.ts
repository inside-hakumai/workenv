/**
 * リモートデバッグセッション作成ユースケース
 */

import type { ParsedCliArgs } from '../cli/args.js';
import { prepareProfile, updateLastLaunchedAt } from '../application/services/profileService.js';
import { type CreateSessionResponse, createSession } from '../application/services/remoteDebuggingService.js';

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
