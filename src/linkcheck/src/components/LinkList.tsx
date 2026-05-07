import { Box, Text } from "ink";
import type { LinkState } from "../types.js";
import { LinkRow } from "./LinkRow.js";

interface Props {
  states: LinkState[];
  selectedIndex: number;
}

export function LinkList({ states, selectedIndex }: Props) {
  const okCount = states.filter((s) => s.status === "ok").length;
  const total = states.length;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Symlink Status</Text>
        <Text dimColor>
          {" "}
          ({okCount}/{total} linked)
        </Text>
      </Box>
      {states.map((state, i) => (
        <LinkRow
          key={state.entry.target}
          state={state}
          isSelected={i === selectedIndex}
        />
      ))}
      <Box marginTop={1}>
        <Text dimColor>↑↓: 移動  Enter: リンク修正  q: 終了</Text>
      </Box>
    </Box>
  );
}
