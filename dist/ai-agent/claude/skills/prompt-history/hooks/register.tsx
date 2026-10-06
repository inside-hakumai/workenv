import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { PromptHistoryScope } from '../types'
import {
  dayLabel,
  dayOf,
  filterEntries,
  highlight,
  mergeEntries,
  oneLine,
  parseHistory,
  parseLog,
  parseTranscript,
  projectColor,
  projectName,
  projectOf,
  splitGrepOutput,
  timeOf,
  truncate,
  widthOf,
  TRANSCRIPT_MARK,
  type LogRecord,
  type PromptEntry,
} from './history'

const PANE = 'prompt-history'
const COMMAND = 'prompt-history'
const PAGE = 50
/** The widest a project label gets; longer names are cut. */
const PROJECT_COLUMNS = 14
/** Transcripts one grep reads: its output stays far under the 4 MiB it keeps. */
const GREP_BATCH = 25

/** Where a prompt was typed by the person, not raised by a task or a peer. */
const RECORDED_ORIGINS = new Set(['composer', 'bridge', 'sdk', 'unclassified'])

const query = atom({ plugin: 'prompt-history', key: 'query' } as const, '')
const scope = atom({ plugin: 'prompt-history', key: 'scope' } as const, 'all')
const limit = atom({ plugin: 'prompt-history', key: 'limit' } as const, PAGE)
const revision = atom({ plugin: 'prompt-history', key: 'revision' } as const, 0)
const problem = atom({ plugin: 'prompt-history', key: 'problem' } as const, '')

type $ = EngineInterface

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err))

async function configDir($: $): Promise<string> {
  const configured = await $.env.get('CLAUDE_CONFIG_DIR')
  if (configured) return configured.replace(/\/+$/, '')
  const home = await $.env.get('HOME')
  if (!home) throw new Error('HOME is not set')

  return `${home}/.claude`
}

const logRoot = async ($: $) => `${await configDir($)}/prompt-history-mod/log`
const keptRoot = async ($: $) => `${await configDir($)}/prompt-history-mod/transcripts`

/** The size and time of each transcript when its prompts were last kept. */
type Seen = Record<string, { mtimeMs: number; size: number }>

const isSeen = (value: unknown): value is Seen =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const monthOf = (timestamp: number) => {
  const date = new Date(timestamp)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** The merged prompts, loaded by the command; a reload starts it over. */
let entries: PromptEntry[] | undefined
let writes = Promise.resolve()

/** Reads every `.jsonl` file under `root`, one folder level down. */
async function readRecords(
  $: $,
  root: string,
  source: 'log' | 'transcript',
  problems: string[],
): Promise<PromptEntry[]> {
  const found: PromptEntry[] = []
  if (!(await $.fs.exists(root))) return found

  for (const folder of await $.fs.list(root)) {
    if (folder.kind !== 'dir') continue
    for (const file of await $.fs.list(`${root}/${folder.name}`)) {
      if (file.kind !== 'file' || !file.name.endsWith('.jsonl')) continue
      const name = `${folder.name}/${file.name}`
      try {
        found.push(...parseLog(await $.fs.read(`${root}/${name}`), name, source))
      } catch (err) {
        problems.push(`${name}: ${messageOf(err)}`)
      }
    }
  }

  return found
}

/**
 * Copies the prompts out of every transcript that changed since the last
 * load into this mod's own folder, so they outlast the transcripts' cleanup.
 * Transcripts are read with grep: many are past the 4 MiB one $.fs.read takes.
 */
async function keepTranscripts($: $, problems: string[]): Promise<void> {
  const projects = `${await configDir($)}/projects`
  const kept = await keptRoot($)
  if (!(await $.fs.exists(projects))) return
  const stored = await $.store.get('transcripts')
  const seen: Seen = isSeen(stored) ? stored : {}

  const changed: { path: string; folder: string; sessionId: string; mtimeMs: number; size: number }[] = []
  for (const folder of await $.fs.list(projects)) {
    if (folder.kind !== 'dir') continue
    for (const file of await $.fs.list(`${projects}/${folder.name}`)) {
      if (file.kind !== 'file' || !file.name.endsWith('.jsonl')) continue
      const path = `${projects}/${folder.name}/${file.name}`
      const known = seen[path]
      if (known?.mtimeMs === file.mtimeMs && known.size === file.size) continue
      changed.push({
        path,
        folder: folder.name,
        sessionId: file.name.slice(0, -'.jsonl'.length),
        mtimeMs: file.mtimeMs,
        size: file.size,
      })
    }
  }

  for (let start = 0; start < changed.length; start += GREP_BATCH) {
    const batch = changed.slice(start, start + GREP_BATCH)
    const grep = (paths: string[]) =>
      $.process.run(['grep', '-F', '--null', '-H', TRANSCRIPT_MARK, ...paths], { timeoutMs: 120_000 })
    let ran = await grep(batch.map(file => file.path))
    let lines = splitGrepOutput(ran.stdout)
    if (ran.isStdoutTruncated) {
      lines = new Map()
      for (const file of batch) {
        ran = await grep([file.path])
        if (ran.isStdoutTruncated) problems.push(`${file.sessionId}: too many prompts to read at once`)
        for (const [path, found] of splitGrepOutput(ran.stdout)) lines.set(path, found)
      }
    }

    for (const file of batch) {
      const prompts = parseTranscript(lines.get(file.path) ?? '', file.sessionId)
      if (prompts.length > 0) {
        const records = prompts.map(({ text, timestamp, project, sessionId }) =>
          JSON.stringify({ text, timestamp, project, sessionId }),
        )
        await $.fs.write(`${kept}/${file.folder}/${file.sessionId}.jsonl`, `${records.join('\n')}\n`)
      }
      seen[file.path] = { mtimeMs: file.mtimeMs, size: file.size }
    }
  }

  await $.store.set('transcripts', seen)
}

async function load($: $): Promise<void> {
  const dir = await configDir($)
  const problems: string[] = []
  let history: PromptEntry[] = []

  try {
    history = parseHistory(await $.fs.read(`${dir}/history.jsonl`))
  } catch (err) {
    problems.push(`history.jsonl: ${messageOf(err)}`)
  }
  try {
    await keepTranscripts($, problems)
  } catch (err) {
    problems.push(`transcripts: ${messageOf(err)}`)
  }
  const logged = await readRecords($, await logRoot($), 'log', problems)
  const kept = await readRecords($, await keptRoot($), 'transcript', problems)

  // the log and transcripts hold pastes expanded; history.jsonl may not
  entries = mergeEntries(logged, kept, history)
  await update($, problem, () => problems.join(' / '))
  await update($, revision, n => n + 1)
}

/** Appends to this session's own log file; one write at a time. */
function record($: $, entry: LogRecord): Promise<void> {
  writes = writes
    .then(async () => {
      const path = `${await logRoot($)}/${monthOf(entry.timestamp)}/${entry.sessionId}.jsonl`
      const before = (await $.fs.exists(path)) ? await $.fs.read(path) : ''
      await $.fs.write(path, `${before}${JSON.stringify(entry)}\n`)
    })
    .catch(err => $.ui.log(`prompt-history: could not record the prompt: ${messageOf(err)}`))

  return writes
}

async function insert($: $, entry: PromptEntry, surface: Parameters<$['ui']['copy']>[0]['surface']) {
  await $.ui.close({ id: PANE })
  const { isFilled } = await $.prompt.fill({ text: entry.text, mode: 'insert' })
  if (isFilled) return
  const { isCopied } = await $.ui.copy({ text: entry.text, surface })
  $.ui.toast(
    isCopied
      ? '入力欄に挿入できなかったため、クリップボードにコピーしました'
      : '入力欄に挿入できませんでした',
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Search past prompts across projects and insert one',
      argumentHint: '[query]',
    })
    // after a hot reload the pane may still be open over an empty cache
    if ((await $.ui.panes()).some(pane => pane.id === PANE)) await load($)

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    await update($, query, () => e.args.trim())
    await update($, limit, () => PAGE)
    await load($)
    const opened = await $.ui.open({
      id: PANE,
      title: 'Prompt history',
      focus: true,
      closeOnEscape: true,
    })

    return {
      text: opened.isPlaced
        ? `Prompt history: ${entries?.length ?? 0} prompts loaded.`
        : 'Prompt history: no surface can show the pane here.',
    }
  }).catch(() => ({ text: 'Prompt history: the history could not be loaded.' }))

  on('prompt.submit', async ($, e, next) => {
    const entered = await next(e)
    const isRecorded =
      !('drop' in entered && entered.drop !== undefined) &&
      e.isMeta !== true &&
      RECORDED_ORIGINS.has(e.origin.kind) &&
      e.text.trim() !== '' &&
      !e.text.startsWith(`/${COMMAND}`)
    if (!isRecorded) return entered

    const entry: LogRecord = {
      text: e.text,
      timestamp: await $.clock.now(),
      project: projectOf(await $.session.root()),
      sessionId: await $.session.id(),
      origin: e.origin.kind,
    }
    await record($, entry)
    if (entries !== undefined) {
      entries = [{ ...entry, id: `l:new:${entry.timestamp}`, source: 'log' }, ...entries]
      await update($, revision, n => n + 1)
    }

    return entered
  }).catch(($, e, next) => next(e)) // recording never holds a prompt back

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    await read($, revision)
    const text = await read($, query)
    const where: PromptHistoryScope = await read($, scope)
    const shown = await read($, limit)
    const trouble = await read($, problem)

    if (e.surface === 'mobile') {
      const { Text } = $.ui.resolve(e)

      return <Text dimColor>Prompt history needs a surface with text input.</Text>
    }

    const { Box, Button, Input, Text } = $.ui.resolve(e)
    const all = entries ?? []
    const project = where === 'project' ? await $.session.root() : undefined
    const matched = filterEntries(all, text, project)
    const rows = matched.slice(0, shown)
    const now = await $.clock.now()

    // a row is "HH:mm  prompt  project" inside the pane's padding: the time
    // in a fixed-width face lines the prompts up on every surface
    const promptColumns = (label: string) =>
      Math.max(10, e.props.bodyColumns - 2 - (5 + 2 + 2 + widthOf(label)))

    const days: { day: string; label: string; rows: PromptEntry[] }[] = []
    for (const entry of rows) {
      const day = dayOf(entry.timestamp)
      const last = days.at(-1)
      if (last?.day === day) last.rows.push(entry)
      else days.push({ day, label: dayLabel(entry.timestamp, now), rows: [entry] })
    }

    const setScope = (next: PromptHistoryScope) => () => update($, scope, () => next)
    const count =
      text.trim() === '' && where === 'all'
        ? `${all.length.toLocaleString()} 件`
        : `${matched.length.toLocaleString()} 件 / ${all.length.toLocaleString()} 件中`

    return (
      <Box flexDirection="column" paddingX={1} gap={1}>
        <Box flexDirection="column">
          <Input
            key="query"
            label="検索 "
            placeholder="空白区切りで AND 検索"
            value={text}
            submitLabel="先頭を挿入"
            autoFocus
            onInput={value =>
              update($, query, () => value).then(() => update($, limit, () => PAGE))
            }
            onSubmit={(_, input) => {
              const first = rows[0]
              if (first) void insert($, first, input.surface)
            }}
          />
          <Box flexDirection="row" alignItems="center" columnGap={1}>
            <Button
              key="scope-all"
              label="全プロジェクト"
              variant={where === 'all' ? 'primary' : 'secondary'}
              onPress={setScope('all')}
            />
            <Button
              key="scope-project"
              label="このプロジェクト"
              variant={where === 'project' ? 'primary' : 'secondary'}
              onPress={setScope('project')}
            />
            <Text dimColor>{count}</Text>
          </Box>
          {trouble !== '' && <Text color="error">{trouble}</Text>}
        </Box>

        {entries === undefined && <Text dimColor>/{COMMAND} で読み込みます。</Text>}
        {entries !== undefined && matched.length === 0 && (
          <Text dimColor>一致するプロンプトはありません。</Text>
        )}

        {days.map(({ day, label, rows: dayRows }) => (
          <Box key={`day-${day}`} flexDirection="column">
            <Text weight="semibold" size="footnote" dimColor>
              {label}
            </Text>
            {dayRows.map(entry => {
              const name = projectName(entry.project)
              const label = widthOf(name) > PROJECT_COLUMNS ? truncate(name, PROJECT_COLUMNS) : name
              const line = truncate(oneLine(entry.text), promptColumns(label))
              const onPress = (press: { surface: Parameters<typeof insert>[2] }) =>
                insert($, entry, press.surface)

              return (
                <Box key={`row-${entry.id}`} flexDirection="row" columnGap={2}>
                  <Text dimColor mono>
                    {timeOf(entry.timestamp)}
                  </Text>
                  <Box flexGrow={1} flexShrink={1}>
                    {e.surface === 'terminal' ? (
                      // the terminal draws a Button's Text children styled
                      <Button key={entry.id} plain onPress={onPress}>
                        {highlight(line, text).map(part =>
                          part.isMatch ? (
                            <Text weight="semibold" color="claude">
                              {part.text}
                            </Text>
                          ) : (
                            part.text
                          ),
                        )}
                      </Button>
                    ) : (
                      // a desktop draws a native button from the label alone
                      <Button key={entry.id} plain label={line} onPress={onPress} />
                    )}
                  </Box>
                  <Text color={projectColor(name)} size="footnote">
                    {label}
                  </Text>
                </Box>
              )
            })}
          </Box>
        ))}

        {matched.length > rows.length && (
          <Button
            key="more"
            plain
            dimColor
            label={`さらに表示（残り ${(matched.length - rows.length).toLocaleString()} 件）`}
            onPress={() => update($, limit, n => n + PAGE)}
          />
        )}
      </Box>
    )
  })
}
