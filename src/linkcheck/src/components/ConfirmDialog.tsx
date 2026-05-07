import { Box, Text, useInput } from "ink";
import type { LinkState } from "../types.js";
import { shortPath } from "../format.js";

type FixableStatus = "missing" | "conflict-file" | "conflict-symlink";

interface Props {
  state: LinkState;
  isActive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const STATUS_DESCRIPTIONS: Record<FixableStatus, string> = {
  missing: "シンボリックリンクを作成します。",
  "conflict-file":
    "既存ファイルを .bak にバックアップしてからリンクを作成します。",
  "conflict-symlink":
    "既存リンクを .bak にバックアップしてからリンクを作成します。",
};

export const DIALOG_HEIGHT = 7;

export function ConfirmDialog({ state, isActive, onConfirm, onCancel }: Props) {
  useInput(
    (_input, key) => {
      if (key.return) {
        onConfirm();
      } else if (key.escape) {
        onCancel();
      }
    },
    { isActive },
  );

  const description = STATUS_DESCRIPTIONS[state.status as FixableStatus];

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      backgroundColor="#1a1a2e"
      paddingX={2}
      gap={1}
    >
      <Text bold color="yellow">
        リンクを修正しますか？
      </Text>
      <Box flexDirection="column">
        <Text>
          <Text color="green">{shortPath(state.entry.source)}</Text>
          <Text dimColor> → </Text>
          <Text color="cyan">{shortPath(state.entry.target)}</Text>
        </Text>
        {state.actualTarget && (
          <Text>
            現在のリンク先: <Text color="red">{shortPath(state.actualTarget)}</Text>
          </Text>
        )}
        <Text dimColor>{description}</Text>
      </Box>
      <Text>Enter: 実行 / Escape: キャンセル</Text>
    </Box>
  );
}
