import { Box, Text } from "ink";
import type { LinkState } from "../types.js";
import { shortPath } from "../format.js";

interface Props {
  state: LinkState;
  isSelected: boolean;
  targetWidth: number;
  sourceWidth: number;
  flashText?: string;
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

const SELECTED_BG = "#1a3a5c";

export function LinkRow({ state, isSelected, targetWidth, sourceWidth, flashText }: Props) {
  const config = STATUS_CONFIG[state.status];
  const pointer = isSelected ? "❯ " : "  ";

  return (
    <Box
      width="100%"
      backgroundColor={isSelected ? SELECTED_BG : undefined}
    >
      <Text bold={isSelected}>{pointer}</Text>
      <Box width={targetWidth}>
        <Text dimColor={!isSelected && state.status === "ok"}>
          {shortPath(state.entry.target)}
        </Text>
      </Box>
      <Text> </Text>
      <Box width={sourceWidth}>
        <Text dimColor={!isSelected}>{shortPath(state.entry.source)}</Text>
      </Box>
      <Text> </Text>
      {flashText ? (
        <Text bold color="greenBright">✓ {flashText}</Text>
      ) : (
        <>
          <Text color={config.color}>
            {config.icon} {config.label}
          </Text>
          {state.status === "conflict-symlink" && state.actualTarget && (
            <Text dimColor> ({shortPath(state.actualTarget)})</Text>
          )}
        </>
      )}
    </Box>
  );
}
