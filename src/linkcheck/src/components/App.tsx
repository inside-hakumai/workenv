import { useState, useEffect, useCallback } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import { entries } from "../mapping.js";
import { checkAll, checkLink } from "../checker.js";
import { fixLink } from "../fixer.js";
import type { LinkState } from "../types.js";
import { LinkList } from "./LinkList.js";
import { ConfirmDialog, DIALOG_HEIGHT } from "./ConfirmDialog.js";

type Mode = "list" | "confirm" | "fixing";

interface Flash {
  index: number;
  text: string;
}

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const terminalRows = stdout.rows ?? 24;

  const [states, setStates] = useState<LinkState[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("list");
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<Flash | null>(null);

  useEffect(() => {
    checkAll(entries).then((result) => {
      setStates(result);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 10_000);
    return () => clearTimeout(timer);
  }, [flash]);

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

    try {
      await fixLink(selected);
      const updated = await checkLink(selected.entry);
      setStates((prev) => {
        const next = [...prev];
        next[selectedIndex] = updated;
        return next;
      });
      setFlash({ index: selectedIndex, text: "リンクを作成しました" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFlash({ index: selectedIndex, text: `エラー: ${msg}` });
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

  const dialogTop = Math.floor((terminalRows - DIALOG_HEIGHT) / 2);

  return (
    <Box height={terminalRows} flexDirection="column">
      <LinkList
        states={states}
        selectedIndex={selectedIndex}
        flash={flash}
      />
      {mode === "confirm" && states[selectedIndex] && (
        <Box
          position="absolute"
          top={Math.max(0, dialogTop)}
          width="100%"
          justifyContent="center"
        >
          <ConfirmDialog
            state={states[selectedIndex]}
            isActive={mode === "confirm"}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        </Box>
      )}
    </Box>
  );
}
