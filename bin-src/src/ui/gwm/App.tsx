import { Box, Text } from 'ink';
import { stderr } from 'node:process';
import { useEffect, useState } from 'react';
import { createWorktree, type WorktreeCreationResult } from '../../usecase/createWorktree.js';

type Props = {
  /** CLIから渡されたブランチ名 */
  readonly branch: string;
};

type AppState =
  | { status: 'loading' }
  | { status: 'success'; result: WorktreeCreationResult }
  | { status: 'error'; error: Error };

/**
 * worktree作成の進捗・結果・エラーをInk UIで表示するコンポーネント
 *
 * @param branch - CLIで指定されたブランチ名
 * @returns Inkが描画するノード
 */
export default function GwmApp({ branch }: Props) {
  const [state, setState] = useState<AppState>({ status: 'loading' });

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const result = await createWorktree({ branch });
        if (!mounted) {
          return;
        }

        setState({ status: 'success', result });
      } catch (error: unknown) {
        if (!mounted) {
          return;
        }

        const normalized = error instanceof Error ? error : new Error('予期せぬエラーが発生しました');
        stderr.write(`${normalized.message}\n`);
        setState({ status: 'error', error: normalized });
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [branch]);

  if (state.status === 'loading') {
    return (
      <Box flexDirection="column">
        <Text>worktree作成中... ({branch})</Text>
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

  const sanitizedTransition = `${state.result.branchName} -> ${state.result.sanitizedBranchName}`;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ worktree作成完了</Text>
      <Text>
        PATH={state.result.targetPath} BRANCH={state.result.branchName} HEAD={state.result.headCommit}
      </Text>
      <Text>サニタイズ結果: {sanitizedTransition}</Text>
    </Box>
  );
}
