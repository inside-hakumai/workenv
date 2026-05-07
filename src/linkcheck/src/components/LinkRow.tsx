import { Box, Text } from "ink";
import type { LinkState } from "../types.js";
import { shortPath } from "../format.js";

interface Props {
  state: LinkState;
  isSelected: boolean;
  targetWidth: number;
  sourceWidth: number;
}

const STATUS_CONFIG = {
  ok: { icon: "✓", color: "green" as const, label: "OK" },
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

export function LinkRow({ state, isSelected, targetWidth, sourceWidth }: Props) {
  const config = STATUS_CONFIG[state.status];
  const pointer = isSelected ? "❯" : " ";

  return (
    <Box>
      <Text color={isSelected ? "blue" : undefined} bold={isSelected}>
        {pointer}{" "}
      </Text>
      <Box width={targetWidth}>
        <Text dimColor={state.status === "ok"}>
          {shortPath(state.entry.target)}
        </Text>
      </Box>
      <Text dimColor> </Text>
      <Box width={sourceWidth}>
        <Text dimColor>{shortPath(state.entry.source)}</Text>
      </Box>
      <Text dimColor> </Text>
      <Text color={config.color}>
        {config.icon} {config.label}
      </Text>
      {state.status === "conflict-symlink" && state.actualTarget && (
        <Text dimColor> ({shortPath(state.actualTarget)})</Text>
      )}
    </Box>
  );
}
