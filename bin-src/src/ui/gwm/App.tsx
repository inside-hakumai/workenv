import { Text } from 'ink';

type Props = {
  /** CLIから渡されたブランチ名 */
  readonly branch: string;
};

/**
 * `gwm`エントリ用のプレースホルダーUI
 *
 * 本タスクでは引数検証までを担い、今後のタスクで本実装へ差し替える。
 */
export default function GwmApp({ branch }: Props) {
  return <Text>git-worktree-manager: {branch}</Text>;
}
