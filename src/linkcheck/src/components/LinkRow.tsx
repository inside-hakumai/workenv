import { Box, Text } from "ink";
import type { LinkState } from "../types.js";
import { shortPath } from "../format.js";

interface Props {
  state: LinkState;
  isSelected: boolean;
}

const STATUS_CONFIG = {
  ok: { icon: "✓", color: "green" as const, label: "" },
  missing: { icon: "✗", color: "red" as const, label: "未リンク" },
  "conflict-file": {
    icon: "!",
    color: "yellow" as const,
    label: "ファイルが存在",
  },
  "conflict-symlink": {
    icon: "→",
    color: "cyan" as const,
    label: "別リンク先",
  },
} as const;

export function LinkRow({ state, isSelected }: Props) {
  const config = STATUS_CONFIG[state.status];
  const pointer = isSelected ? "❯" : " ";

  return (
    <Box>
      <Text color={isSelected ? "blue" : undefined} bold={isSelected}>
        {pointer}{" "}
      </Text>
      <Text color={config.color}>{config.icon} </Text>
      <Text dimColor={state.status === "ok"}>
        {shortPath(state.entry.target)}
      </Text>
      {config.label && (
        <Text color={config.color}> ({config.label})</Text>
      )}
      {state.status === "conflict-symlink" && state.actualTarget && (
        <Text dimColor> → {shortPath(state.actualTarget)}</Text>
      )}
    </Box>
  );
}
