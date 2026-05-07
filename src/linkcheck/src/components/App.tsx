import { useState, useEffect, useCallback } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { entries } from "../mapping.js";
import { checkAll, checkLink } from "../checker.js";
import { fixLink } from "../fixer.js";
import type { LinkState } from "../types.js";
import { LinkList } from "./LinkList.js";
import { ConfirmDialog } from "./ConfirmDialog.js";

type Mode = "list" | "confirm" | "fixing";

export function App() {
  const { exit } = useApp();
  const [states, setStates] = useState<LinkState[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("list");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    checkAll(entries).then((result) => {
      setStates(result);
      setLoading(false);
    });
  }, []);

  useInput(
    (_input, key) => {
      if (_input === "q") {
        exit();
        return;
      }
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      }
      if (key.downArrow) {
        setSelectedIndex((i) => Math.min(states.length - 1, i + 1));
      }
      if (key.return) {
        const selected = states[selectedIndex];
        if (selected && selected.status !== "ok") {
          setMode("confirm");
        }
      }
    },
    { isActive: mode === "list" && !loading },
  );

  const handleConfirm = useCallback(async () => {
    const selected = states[selectedIndex];
    if (!selected) return;

    setMode("fixing");
    setMessage("リンクを作成中...");

    try {
      const backedUp = await fixLink(selected);
      const updated = await checkLink(selected.entry);
      setStates((prev) => {
        const next = [...prev];
        next[selectedIndex] = updated;
        return next;
      });
      if (backedUp) {
        setMessage(`リンクを作成しました (バックアップ: ${backedUp})`);
      } else {
        setMessage("リンクを作成しました");
      }
    } catch (err) {
      setMessage(
        `エラー: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setMode("list");
    }
  }, [selectedIndex, states]);

  const handleCancel = useCallback(() => {
    setMode("list");
  }, []);

  if (loading) {
    return <Text>チェック中...</Text>;
  }

  return (
    <Box flexDirection="column">
      <LinkList states={states} selectedIndex={selectedIndex} />
      {mode === "confirm" && states[selectedIndex] && (
        <Box marginTop={1}>
          <ConfirmDialog
            state={states[selectedIndex]}
            isActive={mode === "confirm"}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        </Box>
      )}
      {message && (
        <Box marginTop={1}>
          <Text color="green">{message}</Text>
        </Box>
      )}
    </Box>
  );
}
