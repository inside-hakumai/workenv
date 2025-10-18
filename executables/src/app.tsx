import { Box, Text } from 'ink';
import { useEffect, useMemo, useState } from 'react';
import type { ParsedCliArgs } from './cli/args.js';
import type { CreateSessionResponse } from './application/services/remoteDebuggingService.js';
import { createRemoteDebugSession } from './usecase/createRemoteDebugSession.js';
import ProfileSummary from './ui/components/ProfileSummary.js';
import { ConfigurationError } from './shared/errors.js';

type Props = {
  readonly args: ParsedCliArgs;
};

type AppState =
  | { status: 'loading' }
  | { status: 'success'; response: CreateSessionResponse }
  | { status: 'error'; error: Error };

export default function App({ args }: Props) {
  const [state, setState] = useState<AppState>({ status: 'loading' });

  const { url, profile, port, chromePath, additionalArgs } = args;

  const normalizedArgs = useMemo<ParsedCliArgs>(() => {
    return {
      url,
      profile,
      ...(port !== undefined && { port }),
      ...(chromePath !== undefined && { chromePath }),
      ...(additionalArgs !== undefined && { additionalArgs }),
    };
  }, [url, profile, port, chromePath, additionalArgs]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const response = await createRemoteDebugSession(normalizedArgs);
        if (mounted) {
          setState({ status: 'success', response });
        }
      } catch (error: unknown) {
        if (mounted) {
          const cause = error instanceof Error ? error : new Error('予期せぬエラーが発生しました');
          setState({ status: 'error', error: cause });
        }
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [normalizedArgs]);

  if (state.status === 'loading') {
    return (
      <Box flexDirection="column">
        <Text>Chrome起動中...</Text>
      </Box>
    );
  }

  if (state.status === 'error') {
    const isConfigurationError = state.error instanceof ConfigurationError;

    return (
      <Box flexDirection="column">
        {isConfigurationError ? (
          <>
            <Text color="red">ディレクトリアクセスに失敗しました。権限とディスク空き容量を確認してください。</Text>
            <Text color="red">詳細: {state.error.message}</Text>
          </>
        ) : (
          <Text color="red">エラー: {state.error.message}</Text>
        )}
      </Box>
    );
  }

  const { response } = state;

  return (
    <Box flexDirection="column">
      <Text color="green">✓ Chrome起動成功</Text>
      <ProfileSummary profile={response.profile} />
      <Text>ポート: {response.port}</Text>
      <Text>DevTools: {response.wsEndpoint}</Text>
      {response.chromeProcessPid ? <Text>プロセスID: {response.chromeProcessPid}</Text> : null}
      {response.launchDurationMs ? <Text>起動時間: {response.launchDurationMs}ms</Text> : null}
    </Box>
  );
}
