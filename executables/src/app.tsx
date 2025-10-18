import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import type { ParsedCliArgs } from './cli/args.js';
import type { CreateSessionResponse } from './application/services/remoteDebuggingService.js';
import { createRemoteDebugSession } from './usecase/createRemoteDebugSession.js';

type Props = {
  readonly args: ParsedCliArgs;
};

type AppState =
  | { status: 'loading' }
  | { status: 'success'; response: CreateSessionResponse }
  | { status: 'error'; error: Error };

export default function App({ args }: Props) {
  const [state, setState] = useState<AppState>({ status: 'loading' });

  useEffect(() => {
    let mounted = true;

    createRemoteDebugSession(args)
      .then(response => {
        if (mounted) {
          setState({ status: 'success', response });
        }
      })
      .catch((error: Error) => {
        if (mounted) {
          setState({ status: 'error', error });
        }
      });

    return () => {
      mounted = false;
    };
  }, [args.url, args.profile, args.port, args.chromePath, args.additionalArgs]);

  if (state.status === 'loading') {
    return (
      <Box flexDirection="column">
        <Text>Chrome起動中...</Text>
      </Box>
    );
  }

  if (state.status === 'error') {
    return (
      <Box flexDirection="column">
        <Text color="red">エラー: {state.error.message}</Text>
      </Box>
    );
  }

  const { response } = state;

  return (
    <Box flexDirection="column">
      <Text color="green">✓ Chrome起動成功</Text>
      <Text>プロファイル: {response.profile.profileName}</Text>
      <Text>ポート: {response.port}</Text>
      <Text>DevTools: {response.wsEndpoint}</Text>
      {response.chromeProcessPid && <Text>プロセスID: {response.chromeProcessPid}</Text>}
      {response.launchDurationMs && <Text>起動時間: {response.launchDurationMs}ms</Text>}
    </Box>
  );
}
