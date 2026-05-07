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
  missing: "リンク先が存在しません。シンボリックリンクを作成します。",
  "conflict-file":
    "リンク先に通常のファイルが存在します。既存ファイルを .bak にバックアップしてからリンクを作成します。",
  "conflict-symlink":
    "リンク先が別のパスへのシンボリックリンクです。既存リンクを .bak にバックアップしてからリンクを作成します。",
};

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
      paddingX={2}
      paddingY={1}
    >
      <Text bold color="yellow">
        リンクを修正しますか？
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text>
          ソース: <Text color="green">{shortPath(state.entry.source)}</Text>
        </Text>
        <Text>
          ターゲット: <Text color="cyan">{shortPath(state.entry.target)}</Text>
        </Text>
        {state.actualTarget && (
          <Text>
            現在のリンク先:{" "}
            <Text color="red">{shortPath(state.actualTarget)}</Text>
          </Text>
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{description}</Text>
      </Box>
      <Box marginTop={1}>
        <Text>
          Enter: 実行 / Escape: キャンセル
        </Text>
      </Box>
    </Box>
  );
}
