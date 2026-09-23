# ワーカー: japanese-natural-writing（Gemini）の候補

担当名は `gemini`。渡されたすべてのファイルについて、japanese-natural-writing の手順で Gemini に書き直させた候補を作る。Gemini の呼び出しは並列に走らせるが、照合はこのワーカーが1ファイルずつ行う。

共通の規則（common-rules.md）を先に読む。

## 準備

1. `echo $HOME` で `$HOME` の値を確かめ、`<JNW>` を `<$HOME の値>/.claude/skills/japanese-natural-writing` とする。以降のコマンドは、`<JNW>` を展開した絶対パスで書く（例: `python3 /Users/xxx/.claude/skills/japanese-natural-writing/scripts/jnw.py doctor`）。`~` やシェル変数を使ったり、`cd`・`&&`・パイプと連結したりすると、サンドボックスの除外設定に一致せず Gemini を呼べない。
2. `<JNW>/SKILL.md` を Read する。以降は、その「1. 引数を確認し、原文を固定する」から「4. 保存して報告する」までの手順を、このワーカー自身がファイルごとに実行する。Skill ツールで呼び出さない。SKILL.md の中の `${CLAUDE_SKILL_DIR}` は `<JNW>` に読み替える。次の点は、SKILL.md より下の指定を優先する。
   - 対象ファイル: `<W>/files/<ファイルID>/pack.md`
   - ユーザー指定: 呼び出し元から「ユーザー指定の用途・文体」が渡された場合だけ、SKILL.md の手順どおり `style_guidance` にする。オーケストレーターが自動で判定した domain や文体は渡さない。
   - 保存先: `<W>/files/<ファイルID>/cand-gemini.md`（`apply --dest` で指定する）
   - 「4. 保存して報告する」の報告は、呼び出し元への返答ではなく、下の「取り込み」の注記に使う。
3. `doctor` は最初に1回だけ実行する。`failed` なら、どのファイルも処理せずに原因を返して終了する。
4. すべてのファイルについて `prepare`（と、ユーザー指定がある場合は `guidance`）を先に済ませ、ファイル ID と jnw の作業ディレクトリの対応を控える。

## Gemini の呼び出しを並列に走らせる

- `run`（初回と修復の両方）は、Bash ツールの `run_in_background: true` で起動する。コマンドの形は SKILL.md のとおりにし、`&` やリダイレクトを付けない。
- 同時に走らせる `run` は **3 つまで**とする。1つ終わるごとに、未処理のファイルの `run` を1つ起動して、3つを保つ。
- 背景のコマンドが終わると通知が届く。出力の JSON で `status` を確かめる。
- タイムアウトで失敗したファイルだけ、`--print-timeout 540` を付けて1回だけ再実行できる（これも並列数に数える）。それ以外の失敗では再実行しない。

## ファイルごとの照合と取り込み

`run` が終わったファイルから順に、SKILL.md の「3. Claudeが独立して照合する」と「4. 保存して報告する」を行う。修復の `run` を待つ間は、次のファイルの照合を進めてよい。

1ファイルの処理が終わったら、次のファイルに進む前に必ず取り込みまで済ませる。途中でこのワーカーが止まっても、済んだファイルの候補が残るようにするため。

1. 注記を `<W>/files/<ファイルID>/notes-gemini.json` に書く。載せるのは、原文に戻した箇所や、意味・トーンの判定で気になった箇所だけでよい。
2. 取り込む。

   ```bash
   python3 <jp.py> unpack <W> <ファイルID> --source gemini --file <W>/files/<ファイルID>/cand-gemini.md --notes <W>/files/<ファイルID>/notes-gemini.json --default-reason "japanese-natural-writing（Gemini）による書き直し。意味とトーンは Claude が照合済み"
   ```

3. 画面の進行状況を更新する: `python3 <jp.py> progress <W> --file-status <ファイルID>=generating:gemini完了`

pack.md の `<!-- jp-block ... -->` の行は HTML コメントなので、jnw.py が目印（`⟦KEEP_nnn⟧`）に置き換えて Gemini から隠し、`render` と `check` で残っているかを確かめる。目印について Gemini に追加の指示はしない。`render` が目印の欠落で失敗した場合は、SKILL.md の手順どおり修復の対象にする。

## コンテキストを節約する

このワーカーは多くのファイルを1つのコンテキストで処理する。

- 照合のために読むのは、SKILL.md が求める `original.md` と `draft.md`（修復した場合は `final.md`）だけにする。
- 同じファイルを読み直さない。
- `run` の出力やログは、`status` と `warnings` だけを確かめる。

## 失敗した場合

- 失敗したファイルは候補を作らずに飛ばし、残りのファイルの処理を続ける。
- 別のモデルや経路に切り替えたり、Claude が自分で書き直したりしない。

## 呼び出し元への返答

本文を含めずに、次を返す。

- 候補を取り込んだファイル ID と、変えた箇所の数
- 失敗したファイル ID と原因
- 処理しなかったファイル ID（途中で止まった場合）
