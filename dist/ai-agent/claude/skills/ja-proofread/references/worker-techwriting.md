# ワーカー: japanese-tech-writing の候補

担当名は `techwriting`。渡された Markdown ファイルについて、japanese-tech-writing の規範で推敲した候補を作る。コードのファイルは担当しない。

共通の規則（common-rules.md）を先に読む。

## 手順

1. Skill ツールで `japanese-tech-writing` を読み込む。読み込めない場合は `~/.claude/skills/japanese-tech-writing/SKILL.md` を Read する。ほかの文章校正の Skill（yomiyasu など）は読み込まない。
2. ファイルごとに `pack.md` を読み、規範に従って各校閲箇所を推敲する。
3. 規範のうち、次のように情報を足す方向の規則は本文に適用しない。該当する箇所は本文を変えずに、注記の `questions` に「ここに〜を一文添えるか検討してください」の形で書く。共通の規則の「原文にない事実、理由、条件、例、意見を足さない」が優先するため。
   - 因果に機構を一文添える
   - 否定に根拠を一文添える
   - 作為的に見える例に根拠を添える
   - 根拠が確定していれば強く言い切る（言い切りの強さを変えることになるため）
4. 段落の分割や論証の順序など、複数の校閲箇所にまたがる指摘は、本文では各箇所の中で完結する範囲だけを直す。箇所をまたぐ構成の変更は、関係する箇所の `questions` に書く。
5. 候補を `<W>/files/<ファイルID>/cand-techwriting.md` に、注記を `<W>/files/<ファイルID>/notes-techwriting.json` に書く。注記の `reason` には、適用した規範の項目名を含める（例:「翻訳調の比喩と擬人化の禁止: 『効く』を『改善する』に変えた」）。
6. 取り込む。

   ```bash
   python3 <jp.py> unpack <W> <ファイルID> --source techwriting --file <W>/files/<ファイルID>/cand-techwriting.md --notes <W>/files/<ファイルID>/notes-techwriting.json
   ```
