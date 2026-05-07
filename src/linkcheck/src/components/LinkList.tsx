import { useState, useEffect } from "react";
import { Box, Text, useStdout } from "ink";
import type { LinkState } from "../types.js";
import { LinkRow } from "./LinkRow.js";

const CHROME_LINES = 4; // header(1) + marginBottom(1) + marginTop(1) + footer(1)
const MIN_VISIBLE = 5;

interface Props {
  states: LinkState[];
  selectedIndex: number;
}

export function LinkList({ states, selectedIndex }: Props) {
  const { stdout } = useStdout();
  const terminalRows = stdout.rows ?? 24;
  const visibleCount = Math.max(MIN_VISIBLE, terminalRows - CHROME_LINES);

  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    setScrollOffset((prev) => {
      if (selectedIndex < prev) return selectedIndex;
      if (selectedIndex >= prev + visibleCount)
        return selectedIndex - visibleCount + 1;
      return prev;
    });
  }, [selectedIndex, visibleCount]);

  const okCount = states.filter((s) => s.status === "ok").length;
  const total = states.length;
  const visibleStates = states.slice(
    scrollOffset,
    scrollOffset + visibleCount,
  );
  const hasMore = total > visibleCount;
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset + visibleCount < total;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Symlink Status</Text>
        <Text dimColor>
          {" "}
          ({okCount}/{total} linked)
        </Text>
        {hasMore && (
          <Text dimColor>
            {" "}
            [{scrollOffset + 1}-{Math.min(scrollOffset + visibleCount, total)}/
            {total}]
          </Text>
        )}
      </Box>
      {canScrollUp && <Text dimColor>  ▲</Text>}
      {visibleStates.map((state, i) => (
        <LinkRow
          key={state.entry.target}
          state={state}
          isSelected={scrollOffset + i === selectedIndex}
        />
      ))}
      {canScrollDown && <Text dimColor>  ▼</Text>}
      <Box marginTop={1}>
        <Text dimColor>↑↓: 移動  Enter: リンク修正  q: 終了</Text>
      </Box>
    </Box>
  );
}
