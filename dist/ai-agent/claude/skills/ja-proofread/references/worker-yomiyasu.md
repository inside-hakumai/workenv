# ワーカー: yomiyasu の候補

担当名は `yomiyasu`。渡された1つ以上のファイルについて、yomiyasu の規則で書き直した候補を作る。

共通の規則（common-rules.md）を先に読む。

## 手順

1. Skill ツールで `yomiyasu` を読み込む。読み込めない場合は `~/.claude/skills/yomiyasu/SKILL.md` を Read する。ほかの文章校正の Skill（japanese-tech-writing など）は読み込まない。規則が干渉するため。
2. ファイルごとに `pack.md` を読み、yomiyasu の「1. 基本原則」と「2. 実行手順」の Step 1〜2 に従って各校閲箇所を書き直す。
   - domain は呼び出し元が指定したものを使う。
   - 文書の立場（勧め・決まり・説明）は、ファイル全体で1つに決める。コードコメントと文字列リテラルは、原則「説明」とする。
   - yomiyasu の「3. 出力フォーマット」は使わない。結果は共通の規則の形式で書く。
   - 「変えたところ」は各箇所の注記の `reason` に、「書き手に確かめたい点」は `questions` に書く。
3. 候補を `<W>/files/<ファイルID>/cand-yomiyasu.md` に、注記を `<W>/files/<ファイルID>/notes-yomiyasu.json` に書く。
4. yomiyasu のリンターで候補を点検する。目印の行が検出された場合は無視する。指摘された箇所は、意味を変えない範囲で直す。リンターが動かない場合は、目視で点検する。

   ```bash
   python3 ~/.claude/skills/yomiyasu/scripts/yomiyasu_lint.py <W>/files/<ファイルID>/cand-yomiyasu.md --json
   ```

5. 取り込む。

   ```bash
   python3 <jp.py> unpack <W> <ファイルID> --source yomiyasu --file <W>/files/<ファイルID>/cand-yomiyasu.md --notes <W>/files/<ファイルID>/notes-yomiyasu.json
   ```
