# Quickstart — Chromeリモートデバッグ起動ユーティリティ

## 前提条件
- Node.js 22 以上（`executables` パッケージはESM構成）
- Google Chrome 112+ または互換ブラウザ（Chrome DevTools Protocol対応）
- macOS 13+ または Linux (X11/Wayland, glibc >=2.31) でChrome実行ファイルを利用可能、もしくは `CHROME_PATH` を指定
- `pnpm`/`npm` いずれかのパッケージマネージャー（リポジトリ標準はnpm）

## セットアップ
```bash
cd /Users/inside-hakumai/workspace/workenv/executables
npm install
```

## ビルド & テスト
- 型チェック: `npx tsc --noEmit`
- テスト: `npm test`（Vitest）
- Lint: `npm run lint`
- ビルド: `npm run build`

## CLI 使い方
```bash
# Chromeパス自動検出、ポート自動割り当て
npx chrome-remote-debug --url https://example.com --profile dev-login

# 明示的なポートとChromeパスを指定
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  npx chrome-remote-debug --url https://staging.example.com --profile qa --port 9223
```

### 主な引数
- `--url <string>`: 必須。HTTP/HTTPSの完全URL
- `--profile <string>`: 必須。小文字英数字 + `-`/`_`。ユーザーデータディレクトリを識別
- `--port <number>`: 任意。1024〜65535。未指定時は自動割り当て
- `--chrome-path <string>`: 任意。Chrome実行ファイルの絶対パス（環境変数より優先）
- `--additional-arg <string>`: 任意繰り返し。Chromeへ渡す追加フラグ（ホワイトリスト制御予定）

### 出力例
```
✔ Chrome executable: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
✔ Profile directory: /Users/me/.ih-dopen/dev-login
✔ Remote debugging port: 9222
DevTools listening on ws://127.0.0.1:9222/devtools/browser/4ea2...
```

## 状態復元の確認手順
1. 初回実行で対象サイトにログイン
2. Chromeを閉じる（CLIはセッション終了を検知して正常終了）
3. 同じ `--profile` でコマンドを再実行
4. ログイン状態や保存済みストレージが保持されていることを確認

> 各プロファイルのデータは `~/.ih-dopen/<profile>` に保存されるため、バックアップや削除はこのディレクトリを直接操作する。

## トラブルシュート
- **Chromeが見つからない**: `CHROME_PATH` を設定するか、`--chrome-path` 引数で明示。macOSは`.app/Contents/MacOS`まで指定する
- **ポート競合エラー**: CLIが候補を提案するので、提案ポートで再実行するか `--port` を変更
- **既存セッション警告**: 同じプロファイル名でChromeが動作中。Chromeを終了するか別のプロファイル名を使用
