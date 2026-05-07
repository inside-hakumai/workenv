import { useState, useEffect, useMemo } from "react";
import { Box, Text, useStdout } from "ink";
import type { LinkState } from "../types.js";
import { shortPath } from "../format.js";
import { LinkRow } from "./LinkRow.js";

// header border(2) + header content(1) + headerMargin(1) + scrollIndicators(2) + footerMargin(1) + footer(1)
const CHROME_LINES = 8;
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

  const total = states.length;
  const okCount = states.filter((s) => s.status === "ok").length;
  const ngCount = total - okCount;

  const { targetWidth, sourceWidth } = useMemo(() => {
    let maxTarget = 0;
    let maxSource = 0;
    for (const s of states) {
      maxTarget = Math.max(maxTarget, shortPath(s.entry.target).length);
      maxSource = Math.max(maxSource, shortPath(s.entry.source).length);
    }
    return { targetWidth: maxTarget, sourceWidth: maxSource };
  }, [states]);
  const visibleStates = states.slice(
    scrollOffset,
    scrollOffset + visibleCount,
  );
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset + visibleCount < total;

  return (
    <Box flexDirection="column">
      <Box
        borderStyle="round"
        borderColor="blue"
        paddingX={1}
        marginBottom={1}
        justifyContent="space-between"
      >
        <Text bold color="blue">
          Workenv Symlink Checker
        </Text>
        <Box gap={2}>
          <Text>
            Total: <Text bold>{total}</Text>
          </Text>
          <Text color="green">
            ✓ Linked: <Text bold>{okCount}</Text>
          </Text>
          <Text color={ngCount > 0 ? "red" : "green"}>
            ✗ Unlinked: <Text bold>{ngCount}</Text>
          </Text>
        </Box>
      </Box>
      {canScrollUp && <Text dimColor>  ▲</Text>}
      {visibleStates.map((state, i) => (
        <LinkRow
          key={state.entry.target}
          state={state}
          isSelected={scrollOffset + i === selectedIndex}
          targetWidth={targetWidth}
          sourceWidth={sourceWidth}
        />
      ))}
      {canScrollDown && <Text dimColor>  ▼</Text>}
      <Box marginTop={1}>
        <Text dimColor>↑↓: 移動  Enter: リンク修正  q: 終了</Text>
      </Box>
    </Box>
  );
}
