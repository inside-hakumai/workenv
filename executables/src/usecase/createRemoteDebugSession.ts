/**
 * リモートデバッグセッション作成ユースケース
 */

import type { ParsedCliArgs } from '../cli/args.js';
import type { CreateSessionResponse } from '../application/services/remoteDebuggingService.js';
import { createSession } from '../application/services/remoteDebuggingService.js';

/**
 * CLI入力からリモートデバッグセッションを作成する
 *
 * @param args - CLI引数
 * @returns セッション作成結果
 */
export async function createRemoteDebugSession(args: ParsedCliArgs): Promise<CreateSessionResponse> {
  return createSession({
    url: args.url,
    profileName: args.profile,
    ...(args.port !== undefined && { port: args.port }),
    ...(args.chromePath !== undefined && { chromePath: args.chromePath }),
    ...(args.additionalArgs !== undefined && { additionalArgs: args.additionalArgs }),
  });
}
