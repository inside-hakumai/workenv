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

const openPane = async ($: Engine, surface: 'terminal' | 'desktop', props = PANE) => {
  await runCommand($)

  return $.ui.mount({
    plugin: 'prompt-history',
    surface,
    component: 'Pane',
    requestId: 'prompt-history',
    props,
  })
}

const SURFACES = ['terminal', 'desktop'] as const

type Pane = Awaited<ReturnType<typeof openPane>>

/** An element of a drawn tree, as far as these tests read one. */
type DrawnNode = {
  type?: string
  props?: { borderStyle?: string; backgroundColor?: string; inverse?: boolean; bold?: boolean }
  children?: unknown[]
}

const isNode = (child: unknown): child is DrawnNode => typeof child === 'object' && child !== null

/** Every string under `node`, in order. */
function textOf(node: unknown): string {
  if (typeof node === 'string') return node
  if (!isNode(node)) return ''

  return (node.children ?? []).map(textOf).join('')
}

/**
 * What the list's Client draws: one entry per line of the list (a row as
 * "time|prompt|project", a heading as its text, the blank between days as
 * " ") without the blank lines that fill the page, how many lines the list
 * takes with them, its row elements, and the preview's lines.
 */
async function viewOf(
  ui: Pane,
): Promise<{ lines: string[]; height: number; rows: DrawnNode[]; preview: string[] }> {
  const root = await ui.drawn({ in: 'list' })
  const items = (isNode(root) ? (root.children ?? []) : []).filter(isNode)
  const preview = items.find(item => item.props?.borderStyle === 'round')
  const list = items.filter(item => item !== preview)
  const lines = list.map(item =>
    item.type === 'Box' ? (item.children ?? []).map(textOf).join('|') : textOf(item),
  )
  while (lines.at(-1) === ' ') lines.pop()

  return {
    lines,
    height: list.length,
    rows: list.filter(item => item.type === 'Box'),
    preview: (preview?.children ?? []).map(textOf),
  }
}

/** Lines the preview takes below the list: its blank, border and 3+2 lines. */
const PREVIEW_BOX_LINES = 1 + 2 + 1 + 3 + 1
/** Lines a page takes in a pane of PANE's height: its rows less the chrome. */
const PAGE_LINES = 30 - (2 + 1 + PREVIEW_BOX_LINES)

/** The rows of the list alone, without headings and blanks. */
const rowsOf = async (ui: Pane) => (await viewOf(ui)).lines.filter(line => line.includes('|'))

describe('検索ペイン', () => {
  for (const surface of SURFACES) {
    test(`${surface}: 全プロジェクトの過去プロンプトを、日付の見出しの下に新しい順に一覧する`, async ($, on) => {
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
      // 「今日」の見出しの下に、時刻・本文・プロジェクト名の行が新しい順に並ぶ
      expect((await viewOf(ui)).lines).toEqual([
        '今日',
        '09:55|newer prompt in app|app',
        '08:30|older prompt in docs|docs',
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
      expect(await rowsOf(ui)).toEqual(['09:50|fix the login bug|app'])
    })

    test(`${surface}: 行をクリックすると、そのプロンプトを入力欄に挿入する`, async ($, on) => {
      // Given
      // 検索ペインに、改行を含むプロンプトが表示されている（見出しの次の行）
      const { filled } = world(on, new Map([[HISTORY_PATH, historyLine('line one\nline two', 10, '/w/app')]]))
      const ui = await openPane($, surface)

      // When
      // その行をクリックする
      await ui.pointer({ type: 'down', x: 10, y: 1, button: 'left', in: 'list' })

      // Then
      // 改行を含む元の文面がそのまま入力欄に入る
      expect(filled).toEqual(['line one\nline two'])
    })
  }

  test('日付が変わるところで空行と見出しを挟む', async ($, on) => {
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
    // 今日の行、空行、昨日の見出しと行の順に並ぶ
    expect((await viewOf(ui)).lines).toEqual(['今日', '09:30|today prompt|app', ' ', '昨日', '10:00|yesterday prompt|app'])
  })

  test('検索欄の横のボタンは「クリア」と表示する', async ($, on) => {
    // Given
    // 1件のプロンプトがある
    world(on, new Map([[HISTORY_PATH, historyLine('only prompt', 10, '/w/app')]]))

    // When
    // コマンドでペインを開く
    const ui = await openPane($, 'desktop')

    // Then
    // 検索欄の送信の文言が「クリア」になる
    expect((await ui.find({ key: 'query' }))?.props.submitLabel).toBe('クリア')
  })

  test('Client を描けない描画先では、行をボタンとして並べる', async ($, on) => {
    // Given
    // 1件のプロンプトがある
    world(on, new Map([[HISTORY_PATH, historyLine('plain row', 10, '/w/app')]]))
    await runCommand($)

    // When
    // VS Code の描画先でペインを描く
    const ui = await $.ui.mount({
      plugin: 'prompt-history',
      surface: 'vscode',
      component: 'Pane',
      requestId: 'prompt-history',
      props: PANE,
    })

    // Then
    // その行がボタンとして並ぶ
    expect((await ui.find({ type: 'Button', text: /plain row/ }))?.text).toBe('09:50  plain row')
  })
})

describe('プレビュー', () => {
  // 見出し（0行目）、newest（1行目）、older（2行目）の順に並ぶ
  const twoPrompts = () =>
    new Map([
      [
        HISTORY_PATH,
        [historyLine('older\nsecond line', 20, '/w/app'), historyLine('newest', 10, '/w/app')].join('\n'),
      ],
    ])

  for (const surface of SURFACES) {
    test(`${surface}: 行を選ぶ前は、先頭のプロンプトを一番下に出す`, async ($, on) => {
      // Given
      // 2件のプロンプトがある
      world(on, twoPrompts())

      // When
      // コマンドでペインを開く
      const ui = await openPane($, surface)

      // Then
      // プレビューに先頭（一番新しい）プロンプトと、先頭の行である旨が出る
      expect((await viewOf(ui)).preview).toEqual(['2026-10-18 09:50 · app · 先頭の行', 'newest'])
    })

    test(`${surface}: マウスを乗せた行の全文を、改行を保ってプレビューに出す`, async ($, on) => {
      // Given
      // 2件のプロンプトを開いたペイン
      world(on, twoPrompts())
      const ui = await openPane($, surface)

      // When
      // 古い方の行にマウスを乗せる
      await ui.pointer({ type: 'move', x: 10, y: 2, in: 'list' })

      // Then
      // プレビューがその行に変わり、本文の2行がそれぞれ1行として出る
      expect((await viewOf(ui)).preview).toEqual([
        '2026-10-18 09:40 · app · マウスの位置（クリックで挿入）',
        'older',
        'second line',
      ])
    })
  }

  test('マウスを行からプレビューの上へ動かしても、最後に乗せた行のプレビューを出し続ける', async ($, on) => {
    // Given
    // 古い方の行にマウスを乗せたペイン
    world(on, twoPrompts())
    const ui = await openPane($, 'desktop')
    await ui.pointer({ type: 'move', x: 10, y: 2, in: 'list' })

    // When
    // マウスを下のプレビューの上へ動かす
    await ui.pointer({ type: 'move', x: 10, y: 5, in: 'list' })

    // Then
    // プレビューは古い方の行のまま
    expect((await viewOf(ui)).preview[1]).toBe('older')
  })

  test('↓キーで次の行を選び、プレビューを切り替える', async ($, on) => {
    // Given
    // 2件のプロンプトを開いたペイン
    world(on, twoPrompts())
    const ui = await openPane($, 'terminal')

    // When
    // 一覧で↓キーを押す
    await ui.key({ key: 'down', in: 'list' })

    // Then
    // プレビューが2件目の行に変わる
    expect((await viewOf(ui)).preview[1]).toBe('older')
  })

  test('検索欄で Enter（またはクリア）を押すと、検索語を消して一覧を全件に戻す', async ($, on) => {
    // Given
    // 1件に絞り込んだペイン
    const { filled } = world(on, twoPrompts())
    const ui = await openPane($, 'desktop')
    await ui.input({ key: 'query', text: 'newest', kind: 'change' })

    // When
    // 検索欄で Enter を押す
    await ui.input({ key: 'query', text: 'newest', kind: 'submit' })

    // Then
    // - 検索欄が空になり、一覧が2件に戻る
    // - 入力欄には何も入らない
    expect({
      query: (await ui.find({ key: 'query' }))?.props.value,
      rows: await rowsOf(ui),
      filled,
    }).toEqual({ query: '', rows: ['09:50|newest|app', '09:40|older ⏎ second line|app'], filled: [] })
  })

  test('プレビューは本文を3行まで出し、残りの行数を添える', async ($, on) => {
    // Given
    // 5行のプロンプト
    world(on, new Map([[HISTORY_PATH, historyLine('1\n2\n3\n4\n5', 10, '/w/app')]]))

    // When
    // コマンドでペインを開く
    const ui = await openPane($, 'desktop')

    // Then
    // 先頭の3行と、隠した2行の数が出る
    expect((await viewOf(ui)).preview.slice(1)).toEqual(['1', '2', '3', '…ほか 2 行'])
  })

  const BACKGROUNDS = {
    terminal: 'userMessageBackgroundHover',
    desktop: 'rgba(128, 128, 128, 0.18)',
  } as const

  for (const surface of SURFACES) {
    test(`${surface}: 選択中の行だけ、行全体にその描画先で描ける控えめな背景色を付ける`, async ($, on) => {
      // Given
      // 2件のプロンプトを開いたペイン
      world(on, twoPrompts())
      const ui = await openPane($, surface)

      // When
      // 古い方の行にマウスを乗せる
      await ui.pointer({ type: 'move', x: 10, y: 2, in: 'list' })

      // Then
      // - 古い方の行の Box だけに背景色が付く（CLI はテーマの色、デスクトップは半透明の灰色）
      // - 時刻の反転と本文の太字は使わない
      const { rows } = await viewOf(ui)
      const texts = rows.flatMap(row => (row.children ?? []).filter(isNode))
      expect({
        backgrounds: rows.map(row => row.props?.backgroundColor),
        isPlain: texts.every(text => text.props?.inverse !== true && text.props?.bold !== true),
      }).toEqual({ backgrounds: [undefined, BACKGROUNDS[surface]], isPlain: true })
    })
  }

  test('件数に関わらず一覧が1ページ分の行数を占め、プレビューの位置が変わらない', async ($, on) => {
    // Given
    // 2件のプロンプトを開いた、ターミナルのペイン
    world(on, twoPrompts())
    const ui = await openPane($, 'terminal')
    const before = await viewOf(ui)

    // When
    // 1件だけに絞り込む
    await ui.input({ key: 'query', text: 'newest', kind: 'change' })

    // Then
    // 一覧は絞り込む前も後も1ページ分の行数を占める
    const after = await viewOf(ui)
    expect({ before: before.height, after: after.height, rows: after.lines }).toEqual({
      before: PAGE_LINES,
      after: PAGE_LINES,
      rows: ['今日', '09:50|newest|app'],
    })
  })

  test('一致するプロンプトがないときも、一覧は1ページ分の行数を占める', async ($, on) => {
    // Given
    // 2件のプロンプトを開いた、ターミナルのペイン
    world(on, twoPrompts())
    const ui = await openPane($, 'terminal')

    // When
    // どれにも一致しない語で絞り込む
    await ui.input({ key: 'query', text: 'nothing matches', kind: 'change' })

    // Then
    // 「一致するプロンプトはありません。」と空行で1ページ分になる
    const { lines, height } = await viewOf(ui)
    expect({ lines, height }).toEqual({ lines: ['一致するプロンプトはありません。'], height: PAGE_LINES })
  })

  test('デスクトップでも、ペインの行数からプレビューなどの分を引いた行数を1ページにする', async ($, on) => {
    // Given
    // 2件のプロンプト
    world(on, twoPrompts())

    // When
    // デスクトップで、65行のペインを開く
    const ui = await openPane($, 'desktop', { ...PANE, scroll: { offset: 0, bodyRows: 65 } })

    // Then
    // 一覧は65行から、検索欄・範囲の行・空行とプレビューの分を引いた行数を占める
    expect((await viewOf(ui)).height).toBe(65 - (2 + 1 + PREVIEW_BOX_LINES))
  })

  test('埋めた空行の上でマウスを動かしてもクリックしても、プレビューも入力欄も変わらない', async ($, on) => {
    // Given
    // 2件のプロンプトを開いたペイン（行は1・2行目、3行目から下は空行）
    const { filled } = world(on, twoPrompts())
    const ui = await openPane($, 'desktop')

    // When
    // 空行の上にマウスを乗せてからクリックする
    await ui.pointer({ type: 'move', x: 10, y: 10, in: 'list' })
    await ui.pointer({ type: 'down', x: 10, y: 10, button: 'left', in: 'list' })

    // Then
    // - プレビューは先頭のまま
    // - 入力欄には何も入らない
    expect({ preview: (await viewOf(ui)).preview[0], filled }).toEqual({
      preview: expect.stringMatching(/先頭の行$/),
      filled: [],
    })
  })

  test('一覧がペインに収まらないときは、ページを分けて送れるようにする', async ($, on) => {
    // Given
    // 同じ日に入力した30件のプロンプト
    const lines = Array.from({ length: 30 }, (_, i) => historyLine(`prompt ${i}`, 30 - i, '/w/app'))
    world(on, new Map([[HISTORY_PATH, lines.join('\n')]]))
    const ui = await openPane($, 'terminal')
    const firstPage = await rowsOf(ui)

    // When
    // 「古い方へ」を押す
    await ui.press({ key: 'page-next' })

    // Then
    // 次のページは、最初のページの最後の次のプロンプトから始まる
    const number = (row: string | undefined) => Number(row?.split('|')[1]?.replace('prompt ', ''))
    expect(number((await rowsOf(ui))[0])).toBe(number(firstPage.at(-1)) - 1)
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
    expect(await rowsOf(ui)).toEqual(['09:30|typed in the desktop app|app', '09:00|typed in the terminal|app'])
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
    expect(await rowsOf(ui)).toEqual(['09:30|kept after cleanup|app'])
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
    expect(await rowsOf(ui)).toEqual(['10:00|brand new prompt|app'])
  })
})
