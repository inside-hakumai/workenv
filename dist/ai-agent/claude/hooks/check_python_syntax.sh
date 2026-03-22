#!/bin/bash
# .claude/hooks/check_python_syntax.sh
# PostToolUse hook: Pythonファイルの作成・更新時に py_compile で構文チェックを行う

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# .py ファイル以外は何もせず正常終了
if [[ ! "$FILE_PATH" =~ \.py$ ]]; then
  exit 0
fi

# ファイルが存在しなければスキップ
if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# py_compile で構文チェック（stderr をキャプチャ）
ERROR_OUTPUT=$(python3 -m py_compile "$FILE_PATH" 2>&1)
EXIT_CODE=$?

if [[ $EXIT_CODE -ne 0 ]]; then
  # 構文エラーあり → additionalContext で Claude にフィードバック
  # jq を使って JSON を安全に構築
  jq -n \
    --arg err "$ERROR_OUTPUT" \
    --arg path "$FILE_PATH" \
    '{
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: ("⚠️ Python syntax error in " + $path + ":\n" + $err + "\nPlease fix the syntax error.")
      }
    }'
  exit 0
fi

# 構文エラーなし → 正常終了
exit 0
