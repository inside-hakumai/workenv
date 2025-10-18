---
description: "Task list template for feature implementation"
---

# Tasks: Chromeリモートデバッグ起動ユーティリティ

**Input**: /specs/001-specify-scripts-bash/  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/  
**テスト**: 仕様で明示要請がないため、本タスクリストではテストタスクを含めない  
**Organization**: ユーザーストーリー単位でグループ化し、独立検証できる増分として整理

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: CLI公開と共通定数・エラー基盤の整備

- [X] T001 [Setup] executables/package.json に `chrome-remote-debug` バイナリ公開設定と説明文を追加し、コマンドの目的をリモートデバッグ仕様に揃える
- [X] T002 [P] [Setup] executables/src/shared/constants.ts を新規作成し CLI名、プロフィールルート (`~/.ih-dopen`)、デフォルトポート範囲など共有定数を定義する
- [X] T003 [P] [Setup] executables/src/shared/errors.ts に CLI 用の基底エラー型と ConfigurationError/PortConflictError などの派生を用意し、終了コードを紐付ける

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: すべてのストーリーが依存するドメイン・検証・基盤処理を準備  
**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装は開始不可

- [ ] T004 [Foundation] executables/src/domain/browserProfile.ts に BrowserProfile 型と `validateBrowserProfileName`/`resolveProfilePaths` を実装する
- [ ] T005 [P] [Foundation] executables/src/domain/remoteDebugSession.ts に RemoteDebugSession と状態列挙、`buildRemoteDebugSession` ヘルパーを実装する
- [ ] T006 [P] [Foundation] executables/src/domain/portAllocation.ts に PortValidationResult/PortSuggestion 型とバリデーション規約を定義する
- [ ] T007 [P] [Foundation] executables/src/domain/chromeLaunchOptions.ts に ChromeLaunchOptions と安全なフラグホワイトリスト生成処理を追加する
- [ ] T008 [Foundation] executables/src/infrastructure/chrome/detectChromeExecutable.ts で CHROME_PATH > 既定パス探索 > which の順に Chrome 実行ファイルを解決する
- [ ] T009 [P] [Foundation] executables/src/infrastructure/ports/checkPortAvailability.ts に `net.createServer` を用いた事前ポート検査を実装する
- [ ] T010 [Foundation] executables/src/shared/fs/userDataRoot.ts で `~/.ih-dopen` ルート作成と権限チェック、プロフィール配下パス解決を提供する
- [ ] T011 [P] [Foundation] executables/src/shared/logger.ts に Ink 互換のステータスログ/エラーログフォーマッタを用意する

**Checkpoint**: ドメイン・基盤処理が揃い、ユーザーストーリー実装を開始できる

---

## Phase 3: User Story 1 - 自動テスト用ブラウザを即時に立ち上げたい (Priority: P1) 🎯 MVP

**Goal**: URLとプロファイル名を指定してコマンドを叩くと、外部自動化ツールから操作可能なブラウザが即座に起動する  
**Independent Test**: URLとプロファイル名を指定した単体コマンド実行でブラウザ起動とリモートデバッグ接続が確認できる

- [ ] T012 [US1] executables/src/cli/args.ts を作成し meow で `--url`/`--profile`/`--port`/`--chrome-path`/`--additional-arg` を定義、バリデーションとヘルプを整備する
- [ ] T013 [US1] executables/src/cli.tsx を更新して新しい引数解析を呼び出し、App へ検証済み入力とローディング状態を渡す
- [ ] T014 [US1] executables/src/app.tsx を置き換え、Ink で進捗 (検出/起動/成功/失敗) と DevTools エンドポイント表示を実装する
- [ ] T015 [P] [US1] executables/src/infrastructure/chrome/chromeArguments.ts を追加し ChromeLaunchOptions からフラグ配列を生成する
- [ ] T016 [US1] executables/src/infrastructure/chrome/spawnChrome.ts で `child_process.spawn` により Chrome を起動し、`DevTools listening on` を待って RemoteDebugSession を返す
- [ ] T017 [P] [US1] executables/src/infrastructure/ports/autoAllocatePort.ts にユーザー指定ポート検証と未指定時の自動割り当て処理を実装する
- [ ] T018 [US1] executables/src/application/services/remoteDebuggingService.ts に `createSession` を実装し、Chromeパス検出→ポート確保→Chrome起動→レスポンス整形を連結する
- [ ] T019 [US1] executables/src/usecase/createRemoteDebugSession.ts を作成し CLI入力をサービスへ渡し、`CreateSessionResponse` 相当の結果を UI に返す

**Checkpoint**: `chrome-remote-debug` 実行でブラウザ起動と DevTools エンドポイント表示が完了する

---

## Phase 4: User Story 2 - 以前の状態を保ったままブラウザを再起動したい (Priority: P2)

**Goal**: 同じプロファイル名で再実行した際に前回のログイン状態やクッキーを引き継げる  
**Independent Test**: 初回実行で状態を保存し Chrome を閉じた後、同じプロファイルで再実行して状態が維持される

- [ ] T020 [US2] executables/src/infrastructure/storage/profileDirectory.ts を追加し プロファイルディレクトリ作成、権限チェック、`session.lock` 排他判定を実装する
- [ ] T021 [US2] executables/src/application/services/profileService.ts に プロファイル読込/作成、最終起動時刻の更新、ロック検出時のエラー返却を実装する
- [ ] T022 [P] [US2] executables/src/ui/components/ProfileSummary.tsx を作成し プロファイルディレクトリと状態復元可否を表示する Ink コンポーネントを用意する
- [ ] T023 [US2] executables/src/usecase/createRemoteDebugSession.ts を拡張し プロファイルサービスを呼び出してロック確認・最終起動更新・レスポンスへのプロファイル情報付与を行う
- [ ] T024 [US2] executables/src/application/contracts/getProfileStatus.ts に `/remote-debugging/profiles/{profileName}` を満たすプロファイル状態取得ロジックを実装する
- [ ] T025 [US2] executables/src/app.tsx を更新し プロファイル再利用メッセージとディレクトリアクセス失敗時の案内を表示する

**Checkpoint**: プロファイル単位の状態復元が動作し、再起動後もセッションが持続する

---

## Phase 5: User Story 3 - 複数セッションを安全に並行運用したい (Priority: P3)

**Goal**: 別のプロファイルやポート番号で複数回コマンドを実行しても競合せず起動できる  
**Independent Test**: 異なるプロファイル名やポート番号で複数回コマンドを実行し互いに干渉しないことを確認する

- [ ] T026 [US3] executables/src/infrastructure/session/sessionRegistry.ts を追加し アクティブセッション/プロファイルロックを追跡して重複起動を防ぐ
- [ ] T027 [P] [US3] executables/src/infrastructure/ports/suggestPorts.ts に ポート競合時の代替ポート候補生成ロジックを実装する
- [ ] T028 [US3] executables/src/application/services/remoteDebuggingService.ts を拡張し セッション登録と競合検知、推奨ポート付きエラーを返せるようにする
- [ ] T029 [US3] executables/src/application/contracts/endSession.ts に `/remote-debugging/sessions/{sessionId}` DELETE 契約を実装し セッション終了を通知できるようにする
- [ ] T030 [US3] executables/src/app.tsx を更新し 複数セッション運用時の警告・代替ポート提案・手動終了手順を表示する
- [ ] T031 [US3] executables/src/usecase/createRemoteDebugSession.ts を拡張し セッション登録/解除とポート提案メッセージの整形を行う

**Checkpoint**: 並列起動時の競合制御とセッション管理が整い、チーム同時利用が可能になる

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: ドキュメントと横断的な改善で運用性を高める

- [ ] T032 [Polish] specs/001-specify-scripts-bash/quickstart.md を更新し 複数セッション運用とポート競合時の再実行手順を追記する
- [ ] T033 [P] [Polish] executables/docs/error-codes.md を新規作成し エラーコード/終了コードと対処ガイドを整理する

---

## Dependencies & Execution Order

### フェーズ依存関係
- Setup (Phase 1) → Foundational (Phase 2) → 各ユーザーストーリー (Phase 3〜5) → Polish (Phase 6)
- Phase 2 完了まではユーザーストーリーに着手しない
- Phase 3〜5 は優先度順 (P1 → P2 → P3) を推奨しつつ、前フェーズ完了後は並行担当も可能

### ユーザーストーリー依存関係
- US1 は基盤フェーズ完了後に単独で実装可能
- US2 は US1 が提供する起動フローにプロフィール管理を差し込むため US1 完了を前提
- US3 は US1/US2 のフローを拡張して競合制御を行うため、両ストーリーの成果を前提とする

### ストーリー内の進め方
- ドメイン/インフラ (T015〜T017 等) → サービス (T018) → ユースケース (T019) → UI (T014/T025/T030) の順に実装
- 同じファイルを編集するタスクは番号順に処理し競合を避ける
- データ取得契約 (T024/T029) は対応するサービスが整ってから着手

## Parallel Execution Examples

- US1: `T015` (Chromeフラグ生成) と `T017` (ポート自動割り当て) は別モジュールのため並行実装可能
- US2: `T022` (ProfileSummaryコンポーネント) と `T024` (プロファイル状態契約) はサービス依存を共有しないため並行実装可能
- US3: `T027` (ポート提案) と `T029` (セッション終了契約) は独立ファイルで並行し、完了後に `T028` と `T030` へ合流する
- Polish: `T033` (エラーコードドキュメント) は `T032` の Quickstart 更新と同時進行できる

## Implementation Strategy

### MVP優先 (User Story 1)
1. Phase 1→Phase 2 を完了し基盤を整える
2. Phase 3 (US1) のタスク T012〜T019 を順次実装
3. DevTools エンドポイント確認とリモート接続確認で MVP を検証

### 段階的な増分
1. MVP (US1) リリース後、US2 のプロフィール永続化 (T020〜T025) を追加
2. US2 検証後に US3 の並行運用対応 (T026〜T031) を実装
3. 各完了ポイントで CLI を配布し、利用者フィードバックを反映

### チーム並行開発
1. 共通基盤 (Phase 1〜2) を全員で完了
2. US1 実装チームは T012〜T019 へ、別メンバーは並行で US2 の UI/契約 (T022/T024) の下準備を進める
3. US3 フェーズでセッション管理 (T026/T028/T031) とポート提案/ドキュメント (T027/T032/T033) を分担し、最終統合前に合同レビューを実施

