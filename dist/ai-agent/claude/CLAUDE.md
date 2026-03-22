# CLAUDE.md (Global)

This file provides the global guidance to Claude Code (claude.ai/code).

## Global Rules

- **You must think exclusively in English**. However, you are required to **respond in Japanese**.
- To understand how to use a library, **always use the Contex7 MCP** to retrieve the latest information.
- Please respond critically and without pandering to my opinions, but please don't be forceful in your criticism.

## Python実行ルール
- Pythonコードをヒアドキュメント（`python3 << 'EOF'`）で実行してはならない
- 必ず .py ファイルとして保存してから `python3 ファイル名.py` で実行すること
- ファイルは .claude/tmp_scripts/ に配置すること
- ファイル名は `YYYYMMDD_HHMMSS_目的.py` とすること
  - 例: 20260320_143022_clean_csv.py
