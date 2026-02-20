# Codex Execution Plans (ExecPlans):

This document describes the requirements for an execution plan ("ExecPlan"), a design document that a coding agent can follow to deliver a working feature or system change. Treat the reader as a complete beginner to this repository: they have only the current working tree and the single ExecPlan file you provide. There is no memory of prior plans and no external context.

## How to use ExecPlans and PLANS.md

When authoring an executable specification (ExecPlan), follow PLANS.md _to the letter_. If it is not in your context, refresh your memory by reading the entire PLANS.md file. Be thorough in reading (and re-reading) source material to produce an accurate specification. When creating a spec, start from the skeleton and flesh it out as you do your research.

When implementing an executable specification (ExecPlan), do not prompt the user for "next steps"; simply proceed to the next milestone. Keep all sections up to date, add or split entries in the list at every stopping point to affirmatively state the progress made and next steps. Resolve ambiguities autonomously, and commit frequently.

When discussing an executable specification (ExecPlan), record decisions in a log in the spec for posterity; it should be unambiguously clear why any change to the specification was made. ExecPlans are living documents, and it should always be possible to restart from _only_ the ExecPlan and no other work.

When researching a design with challenging requirements or significant unknowns, use milestones to implement proof of concepts, "toy implementations", etc., that allow validating whether the user's proposal is feasible. Read the source code of libraries by finding or acquiring them, research deeply, and include prototypes to guide a fuller implementation.

## Session Resumption Protocol

ExecPlans are designed to survive session interruptions, agent restarts, and agent substitutions. When a new session (or a new agent) picks up an ExecPlan, it must follow the procedures below exactly.

### Resumption Procedure (mandatory)

1. Read PLANS.md from start to finish to understand the format and requirements for ExecPlans.
2. Read the target ExecPlan file from start to finish. Never begin reading from the middle.
3. Inspect the `Progress` section and identify the last checked item (the final completed step).
4. Read the `Repository State Snapshot` section. Verify the described state against the actual repository: confirm that listed files exist, that listed tests pass, and that the noted commit hash matches. If there is any discrepancy between the snapshot and reality, record it in `Surprises & Discoveries` and resolve the discrepancy before proceeding to the next step.
5. Read the `Decision Log` to understand all past design decisions. Do not make contradictory decisions when the same issue arises again.
6. Resume work from the first incomplete step.

### Suspension Obligations (mandatory)

Before ending a session, or upon completing a milestone, the agent must perform all of the following:

1. Update `Progress` to reflect the latest state. Split any partially completed task into "done" and "remaining" entries.
2. Update the `Repository State Snapshot` (following the format described in the Skeleton).
3. Commit any uncommitted changes. Include the current milestone number and step in the commit message.
4. Record all decisions made during the session in the `Decision Log`.
5. Commit the ExecPlan file itself (the ExecPlan update must be persisted in the repository).

## Cross-Agent Handoff

ExecPlans explicitly support workflows where different agents (or models) handle the design phase and the implementation phase.

### Authoring Agent Responsibilities

The authoring agent (the one that creates the ExecPlan) must satisfy the following:

* The `Context and Orientation` section must exhaustively describe the repository's directory structure, the paths and roles of key files, and how to build and run tests. Write as if the implementing agent has never seen the repository before.
* The `Interfaces and Dependencies` section must specify type signatures, function names, and module paths concretely. Vague directives such as "define an appropriate interface" are prohibited.
* Each milestone must begin with explicit prerequisites stating which files must exist and which tests must pass before the milestone can start.
* Where multiple design alternatives exist, the chosen approach and its rationale must be recorded in the `Decision Log`. Minimize the room for the implementing agent to make independent design judgments.

### Implementing Agent Responsibilities

The implementing agent (the one that executes the ExecPlan) must observe the following:

* Before beginning work, execute the `Session Resumption Protocol` resumption procedure in full.
* Respect the design decisions recorded in the ExecPlan. If a deviation from the design becomes necessary, record the reason in the `Decision Log` _before_ proceeding with the divergent implementation, and update related sections (e.g., `Plan of Work`).
* Update the `Repository State Snapshot` upon completing each milestone.
* If an issue not covered in the design is discovered, record it in `Surprises & Discoveries` and amend the relevant ExecPlan sections.

## Language

NON-NEGOTIABLE REQUIREMENTS (Language):

These rules apply to ExecPlan documents (the output), not to PLANS.md itself.

* All prose in an ExecPlan must be written in Japanese.
* Code, CLI commands, log output, error messages, file paths, and identifiers (function names, variable names, library names, etc.) may remain in English.
* Required section headings must be bilingual (Japanese + English), e.g. `## Progress / 進捗`. When referencing an English section name in the body text, provide a Japanese explanation on first use.
* When an English technical term is used, it must be defined in Japanese on first use (parenthetical definitions are acceptable). Do not use a term that cannot be defined.
* Before finalizing, self-check that all prose is in Japanese. Convert any stray English sentences to Japanese (log excerpts and quotations are exempt).

## Requirements

NON-NEGOTIABLE REQUIREMENTS:

* Every ExecPlan must be fully self-contained. Self-contained means that in its current form it contains all knowledge and instructions needed for a novice to succeed.
* Every ExecPlan is a living document. Contributors are required to revise it as progress is made, as discoveries occur, and as design decisions are finalized. Each revision must remain fully self-contained.
* Every ExecPlan must enable a complete novice to implement the feature end-to-end without prior knowledge of this repo.
* Every ExecPlan must produce a demonstrably working behavior, not merely code changes to "meet a definition".
* Every ExecPlan must define every term of art in plain language or do not use it.

Purpose and intent come first. Begin by explaining, in a few sentences, why the work matters from a user's perspective: what someone can do after this change that they could not do before, and how to see it working. Then guide the reader through the exact steps to achieve that outcome, including what to edit, what to run, and what they should observe.

The agent executing your plan can list files, read files, search, run the project, and run tests. It does not know any prior context and cannot infer what you meant from earlier milestones. Repeat any assumption you rely on. Do not point to external blogs or docs; if knowledge is required, embed it in the plan itself in your own words. If an ExecPlan builds upon a prior ExecPlan and that file is checked in, incorporate it by reference. If it is not, you must include all relevant context from that plan.

## Formatting

Format and envelope are simple and strict. Each ExecPlan must be one single fenced code block labeled as `md` that begins and ends with triple backticks. Do not nest additional triple-backtick code fences inside; when you need to show commands, transcripts, diffs, or code, present them as indented blocks within that single fence. Use indentation for clarity rather than code fences inside an ExecPlan to avoid prematurely closing the ExecPlan's code fence. Use two newlines after every heading, use # and ## and so on, and correct syntax for ordered and unordered lists.

When writing an ExecPlan to a Markdown (.md) file where the content of the file *is only* the single ExecPlan, you should omit the triple backticks.

Write in plain prose. Prefer sentences over lists. Avoid checklists, tables, and long enumerations unless brevity would obscure meaning. Checklists are permitted only in the `Progress` section, where they are mandatory. Narrative sections must remain prose-first.

## Guidelines

Self-containment and plain language are paramount. If you introduce a phrase that is not ordinary English ("daemon", "middleware", "RPC gateway", "filter graph"), define it immediately and remind the reader how it manifests in this repository (for example, by naming the files or commands where it appears). Do not say "as defined previously" or "according to the architecture doc." Include the needed explanation here, even if you repeat yourself.

Avoid common failure modes. Do not rely on undefined jargon. Do not describe "the letter of a feature" so narrowly that the resulting code compiles but does nothing meaningful. Do not outsource key decisions to the reader. When ambiguity exists, resolve it in the plan itself and explain why you chose that path. Err on the side of over-explaining user-visible effects and under-specifying incidental implementation details.

Anchor the plan with observable outcomes. State what the user can do after implementation, the commands to run, and the outputs they should see. Acceptance should be phrased as behavior a human can verify ("after starting the server, navigating to [http://localhost:8080/health](http://localhost:8080/health) returns HTTP 200 with body OK") rather than internal attributes ("added a HealthCheck struct"). If a change is internal, explain how its impact can still be demonstrated (for example, by running tests that fail before and pass after, and by showing a scenario that uses the new behavior).

Specify repository context explicitly. Name files with full repository-relative paths, name functions and modules precisely, and describe where new files should be created. If touching multiple areas, include a short orientation paragraph that explains how those parts fit together so a novice can navigate confidently. When running commands, show the working directory and exact command line. When outcomes depend on environment, state the assumptions and provide alternatives when reasonable.

Be idempotent and safe. Write the steps so they can be run multiple times without causing damage or drift. If a step can fail halfway, include how to retry or adapt. If a migration or destructive operation is necessary, spell out backups or safe fallbacks. Prefer additive, testable changes that can be validated as you go.

Validation is not optional. Include instructions to run tests, to start the system if applicable, and to observe it doing something useful. Describe comprehensive testing for any new features or capabilities. Include expected outputs and error messages so a novice can tell success from failure. Where possible, show how to prove that the change is effective beyond compilation (for example, through a small end-to-end scenario, a CLI invocation, or an HTTP request/response transcript). State the exact test commands appropriate to the project's toolchain and how to interpret their results.

Capture evidence. When your steps produce terminal output, short diffs, or logs, include them inside the single fenced block as indented examples. Keep them concise and focused on what proves success. If you need to include a patch, prefer file-scoped diffs or small excerpts that a reader can recreate by following your instructions rather than pasting large blobs.

## Milestones

Milestones are narrative, not bureaucracy. If you break the work into milestones, introduce each with a brief paragraph that describes the scope, what will exist at the end of the milestone that did not exist before, the commands to run, and the acceptance you expect to observe. Keep it readable as a story: goal, work, result, proof. Progress and milestones are distinct: milestones tell the story, progress tracks granular work. Both must exist. Never abbreviate a milestone merely for the sake of brevity, do not leave out details that could be crucial to a future implementation.

Each milestone must be independently verifiable and incrementally implement the overall goal of the execution plan.

### Milestone Self-Containment for Session Boundaries

Sessions may be split at milestone boundaries. To support this, each milestone must include the following information within itself:

* **Prerequisites**: The required repository state before the milestone can begin. List the specific files that must exist, the tests that must pass, and any services that must be running.
* **Completion Criteria**: The repository state at the end of the milestone. Include the list of new files, changed files, and tests that now pass.
* **Verification Steps**: The concrete commands and expected outputs to verify the milestone's results. Do not assume the verification steps of a previous milestone; re-state them if necessary.

This information allows a new-session agent to read the top of a milestone and immediately determine what to do and whether the prerequisites are met.

## Living plans and design decisions

* ExecPlans are living documents. As you make key design decisions, update the plan to record both the decision and the thinking behind it. Record all decisions in the `Decision Log` section.
* ExecPlans must contain and maintain a `Progress` section, a `Surprises & Discoveries` section, a `Decision Log`, an `Outcomes & Retrospective` section, and a `Repository State Snapshot` section. These are not optional.
* When you discover optimizer behavior, performance tradeoffs, unexpected bugs, or inverse/unapply semantics that shaped your approach, capture those observations in the `Surprises & Discoveries` section with short evidence snippets (test output is ideal).
* If you change course mid-implementation, document why in the `Decision Log` and reflect the implications in `Progress`. Plans are guides for the next contributor as much as checklists for you.
* At completion of a major task or the full plan, write an `Outcomes & Retrospective` entry summarizing what was achieved, what remains, and lessons learned.

# Prototyping milestones and parallel implementations

It is acceptable—-and often encouraged—-to include explicit prototyping milestones when they de-risk a larger change. Examples: adding a low-level operator to a dependency to validate feasibility, or exploring two composition orders while measuring optimizer effects. Keep prototypes additive and testable. Clearly label the scope as "prototyping"; describe how to run and observe results; and state the criteria for promoting or discarding the prototype.

Prefer additive code changes followed by subtractions that keep tests passing. Parallel implementations (e.g., keeping an adapter alongside an older path during migration) are fine when they reduce risk or enable tests to continue passing during a large migration. Describe how to validate both paths and how to retire one safely with tests. When working with multiple new libraries or feature areas, consider creating spikes that evaluate the feasibility of these features _independently_ of one another, proving that the external library performs as expected and implements the features we need in isolation.

## Skeleton of a Good ExecPlan

    # <短く、行動指向の説明>

    この ExecPlan は生きた文書（living document）である。`Progress / 進捗`、`Surprises & Discoveries / 驚きと発見`、`Decision Log / 意思決定ログ`、`Outcomes & Retrospective / 成果と振り返り`、`Repository State Snapshot / リポジトリ状態スナップショット` の各セクションは作業の進行に合わせて常に最新の状態に保つこと。

    PLANS.md がリポジトリにチェックインされている場合、ここにリポジトリルートからのパスを記載し、この文書が PLANS.md の規約に従って維持されることを明記する。

    ## Purpose / 目的

    この変更によって誰が何をできるようになるか、それをどのように確認できるかを数文で説明する。ユーザーから見える振る舞いを明記する。

    ## Progress / 進捗

    チェックボックス付きリストで細かいステップを要約する。すべての中断点をここに記録すること。部分的に完了したタスクは「完了分」と「残り」に分割する必要がある。このセクションは常に作業の実際の現状を反映しなければならない。

    - [x] (2025-10-01 13:00Z) 完了ステップの例。
    - [ ] 未完了ステップの例。
    - [ ] 部分完了ステップの例（完了: X、残り: Y）。

    タイムスタンプを使って進捗速度を測定する。

    ## Repository State Snapshot / リポジトリ状態スナップショット

    現時点でのリポジトリの状態を記録する。新しいセッションのエージェントが最初に参照するセクションである。マイルストーン完了時、またはセッション終了時に必ず更新すること。

    最終更新: (タイムスタンプ)
    現在のマイルストーン: (マイルストーン番号と名前)

    追加・変更済みファイル:
    - `src/foo/bar.rs` — 新規作成。Planner トレイトの定義を含む。
    - `tests/test_planner.rs` — 新規作成。Planner の単体テスト3件。
    - `Cargo.toml` — 依存関係に `serde` を追加。

    テスト状態:
    - `cargo test` — 全42件パス（新規3件を含む）。
    - `cargo test test_planner` — 3件パス。

    未コミットの変更: なし（すべてコミット済み、最終コミット: abc1234）

    既知の問題・制約:
    - （もしあれば記述。なければ「なし」と明記）

    ## Surprises & Discoveries / 驚きと発見

    実装中に発見された予期しない振る舞い、バグ、最適化、知見を記録する。簡潔な証拠を添える。

    - 観察: …
      証拠: …

    ## Decision Log / 意思決定ログ

    計画に関する作業中に下したすべての決定を以下の形式で記録する:

    - 決定: …
      理由: …
      日時/著者: …

    ## Outcomes & Retrospective / 成果と振り返り

    主要マイルストーンの完了時、または全体の完了時に、成果・残課題・学びをまとめる。結果を当初の目的と比較する。

    ## Context and Orientation / 文脈と全体像

    このタスクに関連する現状を、読み手が何も知らない前提で記述する。主要なファイルとモジュールをフルパスで示す。使用する非自明な用語はすべて定義する。過去の計画を参照しない。

    リポジトリ構造の概要:

        repository-root/
        ├── src/           — メインのソースコード
        │   ├── foo/       — foo モジュール（機能Xを担当）
        │   └── bar/       — bar モジュール（機能Yを担当）
        ├── tests/         — テストコード
        ├── Cargo.toml     — 依存関係の定義
        └── README.md

    ビルド方法: `cargo build`（作業ディレクトリ: リポジトリルート）
    テスト実行方法: `cargo test`（作業ディレクトリ: リポジトリルート）

    ## Milestones / マイルストーン

    ### Milestone 1: （マイルストーン名）

    前提条件（Prerequisites）:
    - リポジトリがクリーンな状態（未コミットの変更なし）
    - `cargo build` が成功すること
    - （その他の前提を列挙）

    スコープ: このマイルストーンでは何を実装し、完了時に何が存在するようになるかを散文で説明する。

    完了条件（Completion Criteria）:
    - `src/foo/planner.rs` が新規作成され、`Planner` トレイトが定義されている
    - `cargo test test_planner` が3件パスする
    - （その他の完了条件を列挙）

    検証手順（Verification Steps）:

        cd /path/to/repo
        cargo test test_planner
        # 期待出力: test result: ok. 3 passed; 0 failed

    ## Plan of Work / 作業計画

    編集と追加の手順を散文で記述する。各編集について、ファイルと場所（関数、モジュール）および挿入・変更する内容を示す。具体的かつ最小限に保つ。

    ## Concrete Steps / 具体的な手順

    実行するコマンドとその実行場所（作業ディレクトリ）を正確に記述する。コマンドが出力を生成する場合、読み手が比較できるよう短い期待出力を示す。このセクションは作業の進行に合わせて更新すること。

    ## Validation and Acceptance / 検証と受け入れ基準

    システムの起動方法や動作確認の方法と、何を観察すべきかを記述する。受け入れ基準は、具体的な入力と出力を伴う振る舞いとして表現する。テストが関係する場合は「`<テストコマンド>` を実行し、`<N>` 件パスすることを期待する。新しいテスト `<名前>` は変更前に失敗し、変更後にパスする」と記述する。

    ## Idempotence and Recovery / 冪等性と復旧

    手順を安全に繰り返し実行できる場合はその旨を記述する。手順にリスクがある場合は、安全なリトライまたはロールバック手順を提供する。完了後に環境をクリーンに保つ。

    ## Artifacts and Notes / 成果物とメモ

    最も重要なターミナル出力、diff、スニペットをインデントされた例として含める。成功を証明するものに焦点を当て、簡潔に保つ。

    ## Interfaces and Dependencies / インターフェースと依存関係

    規範的に記述する。使用するライブラリ、モジュール、サービスとその理由を明記する。マイルストーン完了時に存在すべき型、トレイト/インターフェース、関数シグネチャを指定する。`crate::module::function` や `package.submodule.Interface` のような安定した名前とパスを優先する。例:

    `crates/foo/planner.rs` に以下を定義する:

        pub trait Planner {
            fn plan(&self, observed: &Observed) -> Vec<Action>;
        }

If you follow the guidance above, a single, stateless agent -- or a human novice -- can read your ExecPlan from top to bottom and produce a working, observable result. That is the bar: SELF-CONTAINED, SELF-SUFFICIENT, NOVICE-GUIDING, OUTCOME-FOCUSED.

When you revise a plan, you must ensure your changes are comprehensively reflected across all sections, including the living document sections, and you must write a note at the bottom of the plan describing the change and the reason why. ExecPlans must describe not just the what but the why for almost everything.
