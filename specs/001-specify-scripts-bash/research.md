# Phase 0 Research — Chromeリモートデバッグ起動ユーティリティ

## 調査タスク

- Research Chrome制御向け追加ライブラリ for remote-debugging CLI
- Research Chrome実行パス検出とクロスプラットフォーム対応 for remote-debugging CLI
- Research remote-debugging-portの自動割り当てと競合検知 for remote-debugging CLI
- Research プロファイルユーザーデータ保存戦略 for remote-debugging CLI
- Find best practices for meow in CLIユーティリティ
- Find best practices for Ink in CLI UI
- Research プロジェクト憲章適用方針 for remote-debugging CLI

## 調査結果

### Chrome制御向け追加ライブラリ
- **Decision**: Node.js標準の`child_process.spawn`でChromeを直接起動し、追加ライブラリは導入しない
- **Rationale**: 追加依存を避けて`executables`パッケージの軽量性を維持しつつ、`--remote-debugging-port`や`--user-data-dir`など必要なフラグを明示的に制御できる。公式ドキュメント（developer.chrome.com）のCLI起動例で十分な根拠が得られた
- **Alternatives considered**: `chrome-launcher`（Port検出ロジックは便利だがContext7で一次情報が確認できず依存追加コストが高い）、Playwright/Puppeteer（重量が大きく本要件のブラウザ起動のみには過剰）

### Chrome実行パス検出とクロスプラットフォーム対応
- **Decision**: `CHROME_PATH`環境変数を最優先し、未設定の場合はmacOSとLinuxそれぞれの既定パスおよび`PATH`上のバイナリを探索する（macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` など、Linux: `google-chrome-stable`/`chromium-browser` 等を`which`検索）。探索に失敗した場合は手動設定手順をエラーで案内
- **Rationale**: Chrome公式ドキュメントで示されたCLI起動手順に従えばmacOS/Linuxで必要なフラグを付与できる。環境変数を許容することでCIなど特殊環境にも対応できる
- **Alternatives considered**: macOS `open`コマンドでの起動（追加引数制御が難しい）、`chrome-launcher`のパス探索ロジック流用（依存追加が必要）

### remote-debugging-portの自動割り当てと競合検知
- **Decision**: 指定ポートがあれば`net.createServer`でバインド検証し、失敗時は別ポート候補を提示してエラー終了。未指定の場合は`server.listen(0)`でOSに空きポートを割り当てさせ、その番号を採用。割り当て後は即座にサーバをクローズしてChrome起動に利用する
- **Rationale**: Node.js標準のみでポート可用性チェックが可能で、競合検知を正確に行える。Chrome DevToolsが標準出力するWS URL仕様とも整合する
- **Alternatives considered**: `get-port`などの外部ライブラリ（Context7で確認できず依存増）、Chromeに任せて`--remote-debugging-port=0`を指定（出力されるポートをCLI側が再取得する処理が複雑になる）

- **Decision**: `~/.ih-dopen/<profileName>` を必ず作成し、Chromeの`--user-data-dir`に指定する。ディレクトリ作成時は排他用のロックファイルを設け、同一プロファイルで稼働中の場合は検知してエラーを返す
- **Rationale**: CLI専用ディレクトリをホーム直下に統一することでmacOS/Linux間で挙動が一致し、既存Chromeプロファイルと干渉しない。ロックファイルによる簡易排他でFR-005に対応できる
- **Alternatives considered**: Chrome既定の`Default`プロフィールを共用（状態衝突のリスク）、一時ディレクトリを毎回生成（再起動時の状態引き継ぎ要件を満たさない）

### meowのCLIベストプラクティス
- **Decision**: `importMeta: import.meta`を指定してESM環境に対応し、必須引数（URL, プロファイル名）は`isRequired`でバリデーション。`booleanDefault: undefined`で未指定フラグを除外し、ヘルプ文にサンプルコマンドを明記する
- **Rationale**: Context7で確認したmeowドキュメントはESM利用時に`importMeta`が必須である点と高度なフラグ検証手法を示している。CLI UXを向上させる
- **Alternatives considered**: `yargs`など別のCLIフレームワーク（既存スタックと不一致）、手書き解析（バリデーションとヘルプ整備のコストが増大）

### InkのUIベストプラクティス
- **Decision**: Inkの`Box`レイアウトで状態/エラーメッセージを整理し、`wrap=\"truncate\"`等で長文出力を制御。入力待ちを伴わないため`useStdin`は利用せず、進捗表示は`Text`＋色付けでシンプルに表現する
- **Rationale**: Context7で取得したInkドキュメントに基づき、Flexbox風レイアウトやテキストラップの設定を活用すればCLI画面が読みやすくなる。余計な依存なしで達成可能
- **Alternatives considered**: 外部UIコンポーネントライブラリ（`ink-ui`等、現時点では不要）、素の`console.log`（既存設計でInkを採用しているため一貫性に欠ける）

### プロジェクト憲章適用方針
- **Decision**: `.specify/memory/constitution.md`が空テンプレートであるため、暫定的に「仕様優先・テスト追加・CLI一貫性」の3原則を明文化してプロジェクトノートに記し、実装後にメンテナーへ憲章整備を提案する
- **Rationale**: 憲章本体が未整備で即時参照できないが、最低限の品質指針を内部で定義することで計画フェーズを継続できる。後続作業で正式ドキュメント更新を依頼する
- **Alternatives considered**: 作業停止（ユーザ要求を満たさない）、既存テンプレートの空欄を憲章として解釈（運用上も法的にも意味を成さない）
