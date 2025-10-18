# Implementation Plan: Chromeリモートデバッグ起動ユーティリティ

**Branch**: `001-specify-scripts-bash` | **Date**: 2025-10-18 | **Spec**: `/specs/001-specify-scripts-bash/spec.md`
**Input**: `/specs/001-specify-scripts-bash/spec.md`

**Note**: このテンプレートは `/speckit.plan` コマンドによって生成されます。詳細な実行手順は `.specify/templates/commands/plan.md` を参照してください。

## Summary

指定URLとプロファイル名を受け取り、remote-debugging-port付きのChromeを数秒以内に起動し、外部自動化ツールから即座に制御できるCLIを提供する。既存の`executables` TypeScript/Node.jsスタックを基盤に、Chrome起動制御、プロファイル別ユーザーデータディレクトリ管理、ポート自動割り当て、詳細なエラーハンドリングを段階的に整備する技術アプローチはPhase 0の調査で確定させる。

## Technical Context

**Language/Version**: Node.js 22 (ESM) / TypeScript 5.9  
**Primary Dependencies**: meow 14（CLI引数解析）、ink 6 + React 19（CLI UI）、Node.js `child_process`/`fs`/`net`（プロセス起動・ポート検証）  
**Storage**: ローカルファイルシステム（`~/.ih-dopen/<profileName>` 配下にプロファイル別保存）  
**Testing**: Vitest 3（ユニット/統合）、ink-testing-library（CLIコンポーネント）  
**Target Platform**: macOS 13+ / Linux (X11/Wayland, glibc >=2.31)  
**Project Type**: CLI（Inkベースの対話UI + コマンドライン引数）  
**Performance Goals**: ブラウザ起動から操作可能まで90%ケースで<=5秒（SC-001）、リモート接続成功率95%以上（SC-002）  
**Constraints**: `CHROME_PATH`優先＋macOS/Linux既定パス探索、remote-debugging-portの事前バリデーション、`~/.ih-dopen/<profileName>` にロックファイルを生成して重複起動防止  
**Scale/Scope**: 個人～小規模チーム、推奨同時セッションは10件未満（プロファイル/ポートで分離）

## Constitution Check

*GATE: Phase 0着手前に通過必須。Phase 1完了後に再評価する。*

- GATE-001: `.specify/memory/constitution.md` がプレースホルダのみで原則が不明 → **状態: CONDITIONAL PASS**（暫定原則: 仕様優先・テスト充実・CLI一貫性。実装完了後にメンテナーへ正式憲章整備をエスカレーションする）

## Project Structure

### Documentation (this feature)

```
specs/001-specify-scripts-bash/
├── plan.md              # このファイル
├── research.md          # Phase 0成果（本ドキュメントで作成）
├── data-model.md        # Phase 1成果（本ドキュメントで作成）
├── quickstart.md        # Phase 1成果（本ドキュメントで作成）
├── contracts/           # Phase 1成果（本ドキュメントで作成）
└── tasks.md             # Phase 2成果（/speckit.tasks で作成）
```

### Source Code (repository root)

```
executables/
├── src/
│   ├── cli.tsx                     # CLIエントリー
│   ├── app.tsx                     # Inkルート
│   ├── cli/                        # フラグ定義・入出力変換
│   │   └── commands/
│   ├── application/                # サービス・オーケストレーション
│   ├── domain/                     # エンティティ・値オブジェクト
│   ├── infrastructure/             # Chrome起動・FSアダプタ
│   │   ├── chrome/
│   │   └── storage/
│   ├── usecase/                    # launch-chromeユースケース
│   ├── ui/                         # Inkコンポーネント
│   └── shared/                     # 共通ユーティリティ
├── tests/
│   ├── application/
│   ├── domain/
│   ├── infrastructure/
│   └── integration/
└── dist/
```

**Structure Decision**: `executables` を単一CLIプロジェクトとして維持しつつ、既存ディレクトリを活かしてドメイン/アプリケーション/インフラ/UI層を明示する構造に揃える。Chrome起動とプロファイル管理は `infrastructure`、ユースケース制御は `application` と `usecase`、CLIインタラクションは `cli` と `ui` に配置し、テストはレイヤ別に整理する。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| GATE-001 憲章原則不明 | 暫定原則（仕様優先・テスト充実・CLI一貫性）を策定して計画を継続 | 作業停止するとユーザ要望に応えられない。正式憲章整備はメンテナー依頼で解決 |
