import { describe, expect, test } from 'claude-code/testing'

import {
  dayLabel,
  filterEntries,
  fit,
  highlight,
  mergeEntries,
  oneLine,
  parseHistory,
  parseLog,
  parseTranscript,
  projectName,
  splitGrepOutput,
  truncate,
  type PromptEntry,
} from '../hooks/history'

const at = (minutes: number) => Date.UTC(2026, 9, 1, 0, minutes)

const entry = (fields: Partial<PromptEntry> & Pick<PromptEntry, 'id' | 'text'>): PromptEntry => ({
  timestamp: at(0),
  project: '/w/app',
  source: 'history',
  ...fields,
})

describe('parseHistory', () => {
  test('貼り付けのプレースホルダーを貼り付けた本文に戻す', () => {
    // Given
    // 貼り付けを含むプロンプトを記録した history.jsonl の1行
    const line = JSON.stringify({
      display: '[Pasted text #1 +1 lines] を要約して',
      pastedContents: { '1': { id: 1, type: 'text', content: 'line a\nline b' } },
      timestamp: at(1),
      project: '/w/docs',
      sessionId: 's1',
    })

    // When
    // history.jsonl を読み込む
    const parsed = parseHistory(line)

    // Then
    // 貼り付けた本文を含むプロンプトとして、プロジェクトと共に読み込まれる
    expect(parsed).toMatchObject([{ text: 'line a\nline b を要約して', project: '/w/docs' }])
  })

  test('壊れた行や必要な項目がない行は読み飛ばす', () => {
    // Given
    // - 書き込み途中で切れた行
    // - プロンプト本文がない行
    // - 正常な行
    const text = [
      '{"display":',
      '{"timestamp":1}',
      JSON.stringify({ display: 'ok', timestamp: 2 }),
    ].join('\n')

    // When
    // history.jsonl を読み込む
    const parsed = parseHistory(text)

    // Then
    // 正常な行だけがプロンプトになる
    expect(parsed.map(one => one.text)).toEqual(['ok'])
  })
})

describe('mergeEntries', () => {
  test('独自ログにも記録された同じプロンプトは1件にまとめ、新しい順に並べる', () => {
    // Given
    // - history.jsonl と独自ログの両方に数秒差で記録された同じプロンプト
    // - history.jsonl にだけある古いプロンプト
    const history = [
      entry({ id: 'h:0', text: 'old prompt', timestamp: at(0) }),
      entry({ id: 'h:1', text: 'same prompt', timestamp: at(10) }),
    ]
    const log = parseLog(
      JSON.stringify({
        text: 'same prompt',
        timestamp: at(10) + 3_000,
        project: '/w/app',
        sessionId: 's',
        origin: 'composer',
      }),
      '2026-10/s.jsonl',
    )

    // When
    // 独自ログを優先して2つの記録元を統合する
    const merged = mergeEntries(log, history)

    // Then
    // 重複したプロンプトは独自ログ側だけが残り、新しい順に並ぶ
    expect(merged.map(one => one.id)).toEqual(['l:2026-10/s.jsonl:0', 'h:0'])
  })

  test('時間を空けて同じ文面を入力した場合は別のプロンプトとして残す', () => {
    // Given
    // 1時間空けて同じ文面を入力した、それぞれの記録元の記録
    const history = [entry({ id: 'h:0', text: 'run tests', timestamp: at(0) })]
    const log = [entry({ id: 'l:x:0', text: 'run tests', timestamp: at(60), source: 'log' })]

    // When
    // 2つの記録元を統合する
    const merged = mergeEntries(log, history)

    // Then
    // 両方とも残る
    expect(merged).toHaveLength(2)
  })

  test('3つの記録元にある同じプロンプトは、先に渡した記録元のものだけを残す', () => {
    // Given
    // 独自ログ・トランスクリプト・history.jsonl のそれぞれに数秒差で記録された同じプロンプト
    const log = [entry({ id: 'l', text: 'same', timestamp: at(0) + 2_000, source: 'log' })]
    const transcript = [entry({ id: 't', text: 'same', timestamp: at(0) + 1_000, source: 'transcript' })]
    const history = [entry({ id: 'h', text: 'same', timestamp: at(0) })]

    // When
    // 独自ログ、トランスクリプト、history.jsonl の順で統合する
    const merged = mergeEntries(log, transcript, history)

    // Then
    // 独自ログのものだけが残る
    expect(merged.map(one => one.id)).toEqual(['l'])
  })
})

const transcriptLine = (fields: Record<string, unknown>) =>
  JSON.stringify({
    type: 'user',
    origin: { kind: 'human' },
    uuid: 'u1',
    timestamp: '2026-10-18T10:00:00.000Z',
    cwd: '/w/app',
    message: { role: 'user', content: 'hello' },
    ...fields,
  })

test('フォークしたセッションに写された同じプロンプトは、同じ記録元の中でも1件にまとめる', () => {
  // Given
  // 元のセッションとフォーク先のセッションのトランスクリプトに、同じ時刻で記録された同じプロンプト
  const transcript = [
    entry({ id: 'parent', text: 'Vitest に移行して', project: '/w/ncd', source: 'transcript' }),
    entry({ id: 'fork', text: 'Vitest に移行して', project: '/w/ncd/alice-fe', source: 'transcript' }),
  ]

  // When
  // トランスクリプトを統合する
  const merged = mergeEntries(transcript)

  // Then
  // 先に読んだ1件だけが残る
  expect(merged.map(one => one.id)).toEqual(['parent'])
})

describe('parseTranscript', () => {
  test('ユーザーが送信したプロンプトだけを取り出す', () => {
    // Given
    // - ユーザーが送信したプロンプトの行
    // - バックグラウンドタスクの通知の行
    // - ツール結果の行
    const text = [
      transcriptLine({ uuid: 'p', message: { role: 'user', content: 'デスクトップで入力した依頼' } }),
      transcriptLine({ uuid: 'n', origin: { kind: 'task-notification' }, message: { content: 'task done' } }),
      transcriptLine({ uuid: 'r', origin: undefined, message: { content: [{ type: 'tool_result', content: 'ok' }] } }),
    ].join('\n')

    // When
    // トランスクリプトを読み込む
    const prompts = parseTranscript(text, 'session-1')

    // Then
    // ユーザーのプロンプトだけが、セッションと日時を添えて取り出される
    expect(prompts).toEqual([
      {
        id: 't:session-1:p',
        text: 'デスクトップで入力した依頼',
        timestamp: Date.parse('2026-10-18T10:00:00.000Z'),
        project: '/w/app',
        sessionId: 'session-1',
        source: 'transcript',
      },
    ])
  })

  test('アプリが差し込んだシステムリマインダーを取り除く', () => {
    // Given
    // セッション最初のプロンプトに、デスクトップアプリがシステムリマインダーを前置した行
    const line = transcriptLine({
      message: {
        content: [
          { type: 'text', text: '<system-reminder>\nworking directory is ...\n</system-reminder>' },
          { type: 'text', text: '本題の依頼' },
        ],
      },
    })

    // When
    // トランスクリプトを読み込む
    const prompts = parseTranscript(line, 's')

    // Then
    // ユーザーが入力した本文だけが残る
    expect(prompts.map(one => one.text)).toEqual(['本題の依頼'])
  })

  test('スラッシュコマンドの実行は、入力した形のコマンドとして取り出す', () => {
    // Given
    // 引数付きでスラッシュコマンドを実行した行
    const line = transcriptLine({
      message: {
        content:
          '<command-name>/prompt-history</command-name>\n<command-message>prompt-history</command-message>\n<command-args>login bug</command-args>',
      },
    })

    // When
    // トランスクリプトを読み込む
    const prompts = parseTranscript(line, 's')

    // Then
    // コマンド名と引数が1行になる
    expect(prompts.map(one => one.text)).toEqual(['/prompt-history login bug'])
  })

  test('worktree で動いたセッションは、元のリポジトリのプロジェクトとして扱う', () => {
    // Given
    // worktree の中で入力されたプロンプトの行
    const line = transcriptLine({ cwd: '/w/app/.claude/worktrees/issue-4' })

    // When
    // トランスクリプトを読み込む
    const prompts = parseTranscript(line, 's')

    // Then
    // プロジェクトはリポジトリのパスになる
    expect(prompts.map(one => one.project)).toEqual(['/w/app'])
  })
})

describe('splitGrepOutput', () => {
  test('grep の出力をファイルごとの行に分ける', () => {
    // Given
    // 2つのファイルにまたがる、ファイル名を NUL で区切った grep の出力
    const stdout = '/p/a.jsonl\0{"n":1}\n/p/b.jsonl\0{"n":2}\n/p/a.jsonl\0{"n":3}\n'

    // When
    // ファイルごとに分ける
    const lines = splitGrepOutput(stdout)

    // Then
    // 各ファイルの行がまとまる
    expect(Object.fromEntries(lines)).toEqual({
      '/p/a.jsonl': '{"n":1}\n{"n":3}',
      '/p/b.jsonl': '{"n":2}',
    })
  })
})

describe('filterEntries', () => {
  const entries = [
    entry({ id: 'a', text: 'Fix the login bug', project: '/w/app' }),
    entry({ id: 'b', text: 'ログインの文言を直す', project: '/w/docs' }),
  ]

  test('空白で区切った語をすべて含むプロンプトだけを、大文字小文字を区別せずに返す', () => {
    // When
    // 2語を空白区切りで検索する
    const matched = filterEntries(entries, 'login FIX')

    // Then
    // 両方の語を含むプロンプトだけが返る
    expect(matched.map(one => one.id)).toEqual(['a'])
  })

  test('一部の語しか含まないプロンプトは返さない', () => {
    // When
    // どのプロンプトにも含まれない語を混ぜて検索する
    const matched = filterEntries(entries, 'login nothing')

    // Then
    // 何も返らない
    expect(matched).toEqual([])
  })

  test('プロジェクトのパスも検索対象にする', () => {
    // When
    // プロジェクト名で検索する
    const matched = filterEntries(entries, 'docs')

    // Then
    // そのプロジェクトで入力したプロンプトが返る
    expect(matched.map(one => one.id)).toEqual(['b'])
  })

  test('プロジェクトを指定すると、そのプロジェクトのプロンプトだけを返す', () => {
    // When
    // 検索語なしでプロジェクトを絞り込む
    const matched = filterEntries(entries, '', '/w/app')

    // Then
    // 指定したプロジェクトのプロンプトだけが返る
    expect(matched.map(one => one.id)).toEqual(['a'])
  })
})

describe('表示用の整形', () => {
  test('全角文字を2セルとして数えて切り詰める', () => {
    // When
    // 全角5文字を6セルに収める
    const cut = truncate('あいうえお', 6)

    // Then
    // 全角2文字と省略記号になる
    expect(cut).toBe('あい…')
  })

  test('プロジェクト名の列は、短い名前を空白で埋め、長い名前を切って同じ幅にそろえる', () => {
    // When
    // 短い名前・全角の名前・長い名前を6セルの列に収める
    const cells = [fit('app', 6), fit('日本語', 6), fit('alice-frontend', 6)]

    // Then
    // どれも6セルになる
    expect(cells).toEqual(['app   ', '日本語', 'alice…'])
  })

  test('改行を含むプロンプトは、改行を ⏎ にした1行になる', () => {
    // When
    // 2行のプロンプトを1行にする
    const line = oneLine('first\n  second\n')

    // Then
    // 改行が ⏎ に置き換わる
    expect(line).toBe('first ⏎ second')
  })

  test('デスクトップアプリがセッションごとに作るフォルダは scratch とまとめて表示する', () => {
    // When
    // 一時フォルダで動いたセッションのプロジェクト名を求める
    const name = projectName('/Users/me/Library/Application Support/Claude/scratch-workspaces/a/b/scratch-2026-10-18-d920e5')

    // Then
    // scratch になる
    expect(name).toBe('scratch')
  })
})

describe('highlight', () => {
  test('検索語に一致した部分を、大文字小文字を区別せずに印を付けて切り出す', () => {
    // When
    // 2語で検索した本文を区切る
    const segments = highlight('Fix the Login bug in login form', 'login bug')

    // Then
    // 一致した部分だけに印が付く
    expect(segments).toEqual([
      { text: 'Fix the ', isMatch: false },
      { text: 'Login', isMatch: true },
      { text: ' ', isMatch: false },
      { text: 'bug', isMatch: true },
      { text: ' in ', isMatch: false },
      { text: 'login', isMatch: true },
      { text: ' form', isMatch: false },
    ])
  })

  test('重なり合う一致は1つにまとめる', () => {
    // When
    // 互いに重なる2語で検索した本文を区切る
    const segments = highlight('abcdef', 'abcd cdef')

    // Then
    // 重なった範囲が1つの一致になる
    expect(segments).toEqual([{ text: 'abcdef', isMatch: true }])
  })

  test('検索語がなければ本文をそのまま返す', () => {
    // When
    // 空の検索語で区切る
    const segments = highlight('そのまま', '  ')

    // Then
    // 印のない1つの区切りになる
    expect(segments).toEqual([{ text: 'そのまま', isMatch: false }])
  })
})

describe('dayLabel', () => {
  const now = new Date(2026, 9, 18, 12, 0).getTime()

  test('今日と昨日は言葉で、それ以前は曜日付きの日付で表す', () => {
    // When
    // 今日・昨日・3日前の見出しを求める
    const labels = [
      dayLabel(new Date(2026, 9, 18, 0, 5).getTime(), now),
      dayLabel(new Date(2026, 9, 17, 23, 59).getTime(), now),
      dayLabel(new Date(2026, 9, 15, 9, 0).getTime(), now),
    ]

    // Then
    // 今日・昨日・10月15日（木）になる
    expect(labels).toEqual(['今日', '昨日', '10月15日（木）'])
  })

  test('前の年の日付には年を付ける', () => {
    // When
    // 前の年の日付の見出しを求める
    const label = dayLabel(new Date(2025, 11, 31, 9, 0).getTime(), now)

    // Then
    // 年から始まる
    expect(label).toBe('2025年12月31日（水）')
  })
})
