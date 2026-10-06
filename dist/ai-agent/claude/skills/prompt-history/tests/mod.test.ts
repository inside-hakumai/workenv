import type { On, RenderPropsOf } from 'claude-code'
import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const HOME = '/home/tester'
const HISTORY_PATH = `${HOME}/.claude/history.jsonl`
const LOG_ROOT = `${HOME}/.claude/prompt-history-mod/log`
const PROJECTS = `${HOME}/.claude/projects`
const NOW = new Date(2026, 9, 18, 10, 0).getTime()

const PANE: RenderPropsOf['Pane'] = {
  title: 'Prompt history',
  isFocused: true,
  bodyColumns: 120,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
}

const historyLine = (display: string, minutesAgo: number, project: string) =>
  JSON.stringify({
    display,
    pastedContents: {},
    timestamp: NOW - minutesAgo * 60_000,
    project,
    sessionId: 'old-session',
  })

/** One line of a transcript the desktop app's session wrote. */
const desktopLine = (fields: Record<string, unknown>) =>
  JSON.stringify({
    type: 'user',
    origin: { kind: 'human' },
    entrypoint: 'claude-desktop',
    cwd: '/w/app',
    timestamp: new Date(NOW - 30 * 60_000).toISOString(),
    ...fields,
  })

/**
 * The engine beneath the mod: an in-memory file system holding `files`, grep
 * over it, a store, a session in /w/app, and panes that always open. Filled
 * prompts are pushed to `filled`, and each grep's file list to `grepped`.
 */
function world(on: On, files: Map<string, string>): { filled: string[]; grepped: string[][] } {
  const filled: string[] = []
  const grepped: string[][] = []
  const isUnder = (dir: string) => [...files.keys()].some(path => path.startsWith(`${dir}/`))

  mock.env(on, { HOME })
  mock.store(on)
  on('process.run', ($, e) => {
    const [command, , , , mark = '', ...paths] = e.argv
    if (command !== 'grep') throw new Error(`unexpected command: ${command}`)
    grepped.push(paths)
    const stdout = paths
      .flatMap(path => (files.get(path) ?? '').split('\n').filter(line => line.includes(mark)).map(line => `${path}\0${line}\n`))
      .join('')

    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  mock.clock(on, { now: NOW })
  on('fs.read', ($, e) => {
    const text = files.get(e.path)
    if (text === undefined) throw new Error(`ENOENT: ${e.path}`)

    return { value: text }
  })
  on('fs.exists', ($, e) => ({ value: files.has(e.path) || isUnder(e.path) }))
  on('fs.list', ($, e) => {
    const names = new Set<string>()
    for (const path of files.keys()) {
      if (path.startsWith(`${e.path}/`)) names.add(path.slice(e.path.length + 1).split('/')[0] ?? '')
    }

    return {
      value: [...names].map(name => ({
        name,
        kind: files.has(`${e.path}/${name}`) ? ('file' as const) : ('dir' as const),
        size: 0,
        mtimeMs: 0,
        isLink: false,
      })),
    }
  })
  on('fs.write', ($, e) => {
    files.set(e.path, e.text)

    return { value: undefined }
  })
  on('session.root', () => ({ value: '/w/app' }))
  on('session.id', () => ({ value: 'new-session' }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.panes', () => ({ value: [] }))
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.log', () => ({ value: undefined }))
  on('prompt.fill', ($, e) => {
    filled.push(e.text)

    return { isFilled: true }
  })

  return { filled, grepped }
}

/** Runs /prompt-history, which loads every source and opens the pane. */
const runCommand = ($: Engine) =>
  $.command.run({
    command: 'prompt-history',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 },
  })

const openPane = async ($: Engine, surface: 'terminal' | 'desktop') => {
  await runCommand($)

  return $.ui.mount({
    plugin: 'prompt-history',
    surface,
    component: 'Pane',
    requestId: 'prompt-history',
    props: PANE,
  })
}

const SURFACES = ['terminal', 'desktop'] as const

describe('検索ペイン', () => {
  for (const surface of SURFACES) {
    test(`${surface}: 全プロジェクトの過去プロンプトを新しい順に一覧する`, async ($, on) => {
      // Given
      // 2つのプロジェクトで入力したプロンプトが残っている history.jsonl
      world(
        on,
        new Map([
          [
            HISTORY_PATH,
            [historyLine('older prompt in docs', 90, '/w/docs'), historyLine('newer prompt in app', 5, '/w/app')].join('\n'),
          ],
        ]),
      )

      // When
      // コマンドでペインを開く
      const ui = await openPane($, surface)

      // Then
      // 両プロジェクトのプロンプトが新しい順に並ぶ
      const rows = await ui.findAll({ type: 'Button', text: /prompt in/ })
      expect(rows.map(row => row.text.replace(/^.*  /, ''))).toEqual([
        'newer prompt in app',
        'older prompt in docs',
      ])
    })

    test(`${surface}: 検索語の入力で一覧を絞り込む`, async ($, on) => {
      // Given
      // 検索ペインを開いた状態で、文面の異なる2件のプロンプトがある
      world(
        on,
        new Map([[HISTORY_PATH, [historyLine('fix the login bug', 10, '/w/app'), historyLine('write the README', 20, '/w/app')].join('\n')]]),
      )
      const ui = await openPane($, surface)

      // When
      // 検索欄に語を入力する
      await ui.input({ key: 'query', text: 'login', kind: 'change' })

      // Then
      // 語を含むプロンプトだけが残る
      const rows = await ui.findAll({ type: 'Button', text: /the / })
      expect(rows.map(row => row.text)).toEqual([expect.stringContaining('fix the login bug')])
    })

    test(`${surface}: 選んだプロンプトを入力欄に挿入する`, async ($, on) => {
      // Given
      // 検索ペインに、改行を含むプロンプトが表示されている
      const { filled } = world(on, new Map([[HISTORY_PATH, historyLine('line one\nline two', 10, '/w/app')]]))
      const ui = await openPane($, surface)

      // When
      // そのプロンプトの行を押す
      await ui.press({ key: 'h:0' })

      // Then
      // 改行を含む元の文面がそのまま入力欄に入る
      expect(filled).toEqual(['line one\nline two'])
    })
  }
})

describe('一覧の見た目', () => {
  test('日付ごとに見出しを付け、各行に時刻・本文・プロジェクト名を並べる', async ($, on) => {
    // Given
    // 今日と昨日に入力したプロンプト
    world(
      on,
      new Map([
        [HISTORY_PATH, [historyLine('yesterday prompt', 24 * 60, '/w/app'), historyLine('today prompt', 30, '/w/app')].join('\n')],
      ]),
    )

    // When
    // コマンドでペインを開く
    const ui = await openPane($, 'desktop')

    // Then
    // 「今日」「昨日」の見出しが並び、行は時刻・本文のボタン・プロジェクト名の順になる
    const headings = await ui.findAll({ type: 'Text', text: /^(今日|昨日)$/ })
    const row = await ui.find({ key: 'row-h:1' })
    const parts = (row?.children ?? []) as { type: string }[]
    expect({
      headings: headings.map(one => one.text),
      row: row?.text,
      parts: parts.map(part => part.type),
    }).toEqual({
      headings: ['今日', '昨日'],
      row: '09:30today promptapp',
      parts: ['Text', 'Box', 'Text'],
    })
  })
})

describe('デスクトップアプリのセッション', () => {
  test('トランスクリプトに残ったデスクトップでのプロンプトも一覧に出る', async ($, on) => {
    // Given
    // - CLI で入力したプロンプトだけが残っている history.jsonl
    // - デスクトップアプリのセッションのトランスクリプト（ユーザーのプロンプトとツール結果）
    world(
      on,
      new Map([
        [HISTORY_PATH, historyLine('typed in the terminal', 60, '/w/app')],
        [
          `${PROJECTS}/-w-app/desk-1.jsonl`,
          [
            desktopLine({ uuid: 'a', message: { role: 'user', content: 'typed in the desktop app' } }),
            JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } }),
          ].join('\n'),
        ],
      ]),
    )

    // When
    // コマンドでペインを開く
    const ui = await openPane($, 'desktop')

    // Then
    // CLI とデスクトップの両方のプロンプトが新しい順に並ぶ
    const rows = await ui.findAll({ type: 'Button', text: /typed in/ })
    expect(rows.map(row => row.text.replace(/^.*  /, ''))).toEqual([
      'typed in the desktop app',
      'typed in the terminal',
    ])
  })

  test('トランスクリプトのプロンプトを独自フォルダに写し、トランスクリプトが消えても残す', async ($, on) => {
    // Given
    // 一度ペインを開いてトランスクリプトを読み込んだあと、Claude Code の掃除でそのトランスクリプトが消えた状態
    const transcript = `${PROJECTS}/-w-app/desk-1.jsonl`
    const files = new Map([
      [HISTORY_PATH, ''],
      [transcript, desktopLine({ uuid: 'a', message: { role: 'user', content: 'kept after cleanup' } })],
    ])
    world(on, files)
    await runCommand($)
    files.delete(transcript)

    // When
    // もう一度ペインを開く
    const ui = await openPane($, 'terminal')

    // Then
    // 消えたトランスクリプトのプロンプトも一覧に出る
    expect(await ui.find({ type: 'Button', text: /kept after cleanup/ })).toBeDefined()
  })

  test('前回から変わっていないトランスクリプトは読み直さない', async ($, on) => {
    // Given
    // 一度ペインを開いて読み込み済みのトランスクリプト
    const { grepped } = world(
      on,
      new Map([
        [HISTORY_PATH, ''],
        [`${PROJECTS}/-w-app/desk-1.jsonl`, desktopLine({ uuid: 'a', message: { content: 'once' } })],
      ]),
    )
    await runCommand($)

    // When
    // もう一度ペインを開く
    await runCommand($)

    // Then
    // grep は最初の1回だけ実行される
    expect(grepped).toEqual([[`${PROJECTS}/-w-app/desk-1.jsonl`]])
  })
})

describe('プロンプトの記録', () => {
  test('ユーザーが入力したプロンプトを、セッションごとの独自ログに追記する', async ($, on) => {
    // Given
    // - 同じセッションで既に1件記録済みの独自ログ
    // - 入力されたプロンプトをそのまま受け付けるエンジン
    const path = `${LOG_ROOT}/2026-10/new-session.jsonl`
    const files = new Map([[path, `${JSON.stringify({ text: 'earlier', timestamp: NOW - 1 })}\n`]])
    world(on, files)
    on('prompt.submit', ($, e) => ({ text: e.text }))

    // When
    // ユーザーがプロンプトを送信する
    await $.prompt.submit({ text: 'hello there', origin: { kind: 'composer' }, wait: false })

    // Then
    // 既存の記録の後ろに、プロジェクトとセッションを添えて追記される
    const lines = (files.get(path) ?? '').trim().split('\n').map(line => JSON.parse(line))
    expect(lines).toEqual([
      { text: 'earlier', timestamp: NOW - 1 },
      { text: 'hello there', timestamp: NOW, project: '/w/app', sessionId: 'new-session', origin: 'composer' },
    ])
  })

  test('スケジュール実行など、ユーザーの入力ではないプロンプトは記録しない', async ($, on) => {
    // Given
    // 空の独自ログと、プロンプトを受け付けるエンジン
    const files = new Map<string, string>()
    world(on, files)
    on('prompt.submit', ($, e) => ({ text: e.text }))

    // When
    // スケジュールされたタスクがプロンプトを送信する
    await $.prompt.submit({ text: 'nightly check', origin: { kind: 'scheduled-trigger' }, wait: false })

    // Then
    // 何も書き込まれない
    expect([...files.keys()]).toEqual([])
  })

  test('記録した直後のプロンプトが、開いているペインの一覧に現れる', async ($, on) => {
    // Given
    // 空の history.jsonl で検索ペインを開いた状態
    world(on, new Map([[HISTORY_PATH, '']]))
    on('prompt.submit', ($, e) => ({ text: e.text }))
    const ui = await openPane($, 'terminal')

    // When
    // ユーザーがプロンプトを送信する
    await $.prompt.submit({ text: 'brand new prompt', origin: { kind: 'composer' }, wait: false })

    // Then
    // ペインの一覧に表示される
    expect(await ui.find({ type: 'Button', text: /brand new prompt/ })).toBeDefined()
  })
})
