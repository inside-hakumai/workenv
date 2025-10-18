# Data Model — Chromeリモートデバッグ起動ユーティリティ

## エンティティ一覧

### BrowserProfile
- **識別子**: `profileName`（小文字英数字と `-` / `_` のみ、長さ1〜64）
- **フィールド**
  - `profileName`: string — CLI必須引数。正規表現 `^[a-z0-9-_]+$`
  - `dataDirectory`: absolute-path — `~/.ih-dopen/<profileName>` に固定
  - `lockFilePath`: absolute-path — `dataDirectory`内に`session.lock`
  - `createdAt`: datetime — ディレクトリ作成時刻
  - `lastLaunchedAt`: datetime — 最終起動時刻（存在しない場合は `null`）
  - `chromeVersion`: string? — オプション。Chrome起動後にDevTools情報から取得できる場合に保存
- **制約/バリデーション**
  - `dataDirectory`はプロセス起動前に存在確認＋書き込み可能であること
  - `lockFilePath`が存在する場合は既存セッション再利用不可（FR-005）
  - プロファイル名はmacOS/Linuxファイルシステムで安全な文字列（小文字英数字と`-`/`_`のみ）であること

### RemoteDebugSession
- **識別子**: `sessionId`（UUID v4。CLI起動ごとに生成）
- **フィールド**
  - `sessionId`: uuid
  - `profileName`: string — `BrowserProfile.profileName`への外部キー
  - `targetUrl`: url — RFC 3986に準拠し、`http[s]://`を必須
  - `port`: integer — 1024〜65535。未指定時は自動割当
  - `wsEndpoint`: url — Chrome起動後に標準出力から取得
  - `chromeProcessPid`: integer — 起動したChromeプロセスのPID
  - `launchedAt`: datetime
  - `status`: enum[`launching`,`ready`,`failed`] — CLI内部状態
- **制約/バリデーション**
  - `targetUrl`は`new URL()`で妥当性検証し、プロトコルがHTTP/HTTPS限定
  - `port`指定時は`net.createServer`で事前にLISTEN可能であること
  - `wsEndpoint`はChrome標準出力に`DevTools listening on`が出現した時点で確定
  - `status=ready`時にCLIは成功メッセージ＋エンドポイントを出力

### PortAllocation
- **識別子**: `port`
- **フィールド**
  - `port`: integer
  - `requestedByUser`: boolean — CLI引数で明示指定されたか
  - `validationOutcome`: enum[`available`,`occupied`,`error`]
  - `suggestedAlternatives`: integer[] — 競合時に提案するポート候補（最大3件）
- **制約/バリデーション**
  - 自動割当時は`requestedByUser=false`, `port`は`server.address().port`の戻り値
  - `occupied`の場合、CLIはサジェストとともにエラー終了＋非ゼロコード

### ChromeLaunchOptions
- **識別子**: `profileName + timestamp`
- **フィールド**
  - `executablePath`: absolute-path
  - `flags`: string[] — `--remote-debugging-port`, `--user-data-dir`, `--no-first-run` 等
  - `detached`: boolean — プロセス切り離し可否
  - `env`: Record<string,string> — 必要に応じて追加
- **制約/バリデーション**
  - `executablePath`は存在し実行可能でなければならない
  - `flags`内でポートやプロファイルに関する重複指定を禁止

## リレーション
- `BrowserProfile` 1 — 0..1 `RemoteDebugSession`（同名プロファイルの同時稼働は原則1件）
- `RemoteDebugSession.port` は `PortAllocation.port` と1:1で対応
- `ChromeLaunchOptions.profileName` → `BrowserProfile.profileName`

## 状態遷移

### RemoteDebugSession
```
          ┌────────┐     wsEndpoint確定     ┌────────┐
    ┌───▶ │ready   │◀───────────────────────│launching│
    │     └────────┘                        └────────┘
    │          │                                  │
    │          │chrome終了検知/エラー             │Chrome spawn失敗
    │          ▼                                  ▼
    │     ┌────────┐        例外発生        ┌────────┐
    └──── │stopped │◀───────────────────────│failed  │
          └────────┘                        └────────┘
```

- `launching` → `ready`: Chrome標準出力に`DevTools listening on`が出力された時点
- `launching` → `failed`: Spawnエラー／ポート競合／プロファイルロック失敗など
- `ready` → `stopped`: CLIがプロセス終了検知、またはユーザがChromeを閉じた時

## 検証ルールまとめ
- URLは`http`または`https`のみ許容し、その他プロトコルは即時バリデーションエラー
- プロファイル名はファイルシステムセーフであることを正規表現と予約語リストで判定
- プロファイルディレクトリ作成時は`fs.mkdir`（`{recursive:true}`）＋権限チェック
- ロックファイルは`fs.open`の`wx`モードで取得し、取得失敗時は既存セッション扱い
- ポート情報は`net.createServer`でチェックし、検証用サーバは必ず`finally`でclose

## メトリクス
- `launchDurationMs`: `ready`到達までの経過時間（成功事例90%で<=5000msを目標）
- `remoteDebugAvailability`: 直近N回で`status=ready`となった割合（>=95%）
- `profileReuseSuccess`: 同一プロファイルの2回目実行で`status=ready`となる比率（>=95%）
