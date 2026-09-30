# ワーカー: 統合案

担当名は `integrated`。渡されたファイルについて、各 Skill の候補をまとめた「統合案」を作る。簡潔化は別のワーカー（worker-concise.md）が、この統合案を出発点にして行う。統合では、文を削るかどうかの判断はしない。

共通の規則（common-rules.md）を先に読む。このワーカーだけは、他のワーカーの候補を読んでよい。

## 入力

ファイルごとに次を実行し、出力された `view.json` を Read する。

```bash
python3 <jp.py> view <W> <ファイルID>
```

`view.json` には、校閲箇所ごとに原文（`original`）、各 Skill の候補（`candidates.gemini`、`candidates.yomiyasu`、`candidates.techwriting`）、注記（`notes`）が並んでいる。候補がない Skill は、その箇所を変えなかったか、失敗している。

## 統合案（integrated）

各箇所について、原文を出発点にして、各候補の変更を1つずつ取り込む。

1. 各候補を、原文に対する変更（語句の置き換え、語順の変更、文の分割・統合、削除）に分解する。
2. 互いに衝突しない変更は、すべて取り込む。範囲が重なっても両立する変更は、gemini → yomiyasu → techwriting の順に上へ重ねる。
3. 次の場合は「衝突」とし、その部分は原文のままにする。
   - 同じ語句を、候補ごとに別の表現へ変えている
   - 一方の変更が、他方の変更の前提を壊す
   - 両方を取り込むと文が成り立たない

   衝突した部分は、注記の `conflicts` に「原文『…』: gemini『…』 / yomiyasu『…』」の形で書く。ユーザーは各 Skill の候補から選べるので、統合案で無理に決めない。
4. 取り込んだ結果の文がつながるように、助詞や接続を直すのは構わない。ただし、原文にない内容は足さない。
5. 注記の `reason` には、どの候補のどの変更を取り込んだかを1〜2文で書く。各 Skill の注記にある `questions` のうち、統合案にも当てはまるものは引き継ぐ。
6. 統合しても原文と同じになる箇所は、原文のまま残す。
7. 各 Skill の候補が、原文にない句点、主語、接続語を補って長くなっている場合は、意味を変えない範囲で、補った語句を取り込まなくてよい。統合案が原文より長くなるのは、それが読みやすさに必要なときだけにする。

## 出力

ファイルごとに、pack.md と同じ構成で統合案を書き、`unpack` する。

```bash
python3 <jp.py> unpack <W> <ファイルID> --source integrated --file <W>/files/<ファイルID>/cand-integrated.md --notes <W>/files/<ファイルID>/notes-integrated.json
```

注記（`notes-integrated.json`）には `reason`、`conflicts`、`questions` を書く。
