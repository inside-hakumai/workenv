export type PromptEntry = {
  id: string
  text: string
  timestamp: number
  project: string
  sessionId?: string
  source: 'history' | 'log' | 'transcript'
}

/** One line of this mod's own log, as the prompt.submit hook writes it. */
export type LogRecord = {
  text: string
  timestamp: number
  project: string
  sessionId: string
  origin: string
}

/** Two copies of one prompt (history.jsonl and the log) land this close. */
const SAME_PROMPT_MS = 60_000

const PASTE = /\[Pasted text #(\d+)(?: \+\d+ lines)?\]/g

type Row = Record<string, unknown>

const isRow = (value: unknown): value is Row =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function* rowsOf(text: string): Generator<[number, Row]> {
  for (const [index, line] of text.split('\n').entries()) {
    if (line.trim() === '') continue
    try {
      const row: unknown = JSON.parse(line)
      if (isRow(row)) yield [index, row]
    } catch {
      // a line cut short by a concurrent write: skip it
    }
  }
}

/** Puts pasted text back where history.jsonl left a placeholder for it. */
export function expandPastes(display: string, pasted: unknown): string {
  if (!isRow(pasted)) return display

  return display.replace(PASTE, (placeholder, id: string) => {
    const paste = pasted[id]

    return isRow(paste) && paste.type === 'text' && typeof paste.content === 'string'
      ? paste.content
      : placeholder
  })
}

/** Reads `~/.claude/history.jsonl`, the terminal's prompt history. */
export function parseHistory(text: string): PromptEntry[] {
  const entries: PromptEntry[] = []

  for (const [index, row] of rowsOf(text)) {
    if (typeof row.display !== 'string' || typeof row.timestamp !== 'number') continue

    entries.push({
      id: `h:${index}`,
      text: expandPastes(row.display, row.pastedContents),
      timestamp: row.timestamp,
      project: typeof row.project === 'string' ? row.project : '',
      sessionId: typeof row.sessionId === 'string' ? row.sessionId : undefined,
      source: 'history',
    })
  }

  return entries
}

/**
 * Reads one file of records this mod wrote (its own log, or prompts kept from
 * a transcript); `file` keeps the ids apart.
 */
export function parseLog(
  text: string,
  file: string,
  source: 'log' | 'transcript' = 'log',
): PromptEntry[] {
  const entries: PromptEntry[] = []

  for (const [index, row] of rowsOf(text)) {
    if (typeof row.text !== 'string' || typeof row.timestamp !== 'number') continue

    entries.push({
      id: `${source === 'log' ? 'l' : 't'}:${file}:${index}`,
      text: row.text,
      timestamp: row.timestamp,
      project: typeof row.project === 'string' ? row.project : '',
      sessionId: typeof row.sessionId === 'string' ? row.sessionId : undefined,
      source,
    })
  }

  return entries
}

/**
 * Every source, newest first. One text sent within a minute is kept once
 * (a forked session's transcript repeats its parent's prompts, and one prompt
 * sent to several sessions is one prompt to find), from the first source that
 * holds it: pass the sources that keep pastes expanded first.
 */
export function mergeEntries(...sources: PromptEntry[][]): PromptEntry[] {
  const kept = new Map<string, number[]>()
  const merged: PromptEntry[] = []

  for (const entry of sources.flat()) {
    const key = entry.text.trim()
    const times = kept.get(key) ?? []
    if (times.some(timestamp => Math.abs(timestamp - entry.timestamp) <= SAME_PROMPT_MS)) continue
    kept.set(key, [...times, entry.timestamp])
    merged.push(entry)
  }

  return merged.sort((a, b) => b.timestamp - a.timestamp)
}

/** What marks a prompt the person sent in a transcript line, as written. */
export const TRANSCRIPT_MARK = '"origin":{"kind":"human"}'

const REMINDER = /<system-reminder>[\s\S]*?<\/system-reminder>/g
const COMMAND_NAME = /<command-name>([^<]*)<\/command-name>/
const COMMAND_ARGS = /<command-args>([\s\S]*?)<\/command-args>/

/** The text the person typed, from a transcript row's message content. */
export function promptTextOf(content: unknown): string | undefined {
  const raw =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content
            .filter((block): block is Row => isRow(block) && block.type === 'text')
            .map(block => (typeof block.text === 'string' ? block.text : ''))
            .join('\n')
        : ''
  const text = raw.replace(REMINDER, '').trim()
  const command = COMMAND_NAME.exec(text)?.[1]?.trim()
  if (command) return `${command} ${COMMAND_ARGS.exec(text)?.[1]?.trim() ?? ''}`.trim()
  if (text === '' || text.startsWith('<local-command')) return undefined

  return text
}

/** The project a session ran for: a worktree counts as its repository. */
export const projectOf = (cwd: string) => cwd.replace(/\/\.claude\/worktrees\/.*$/, '')

/**
 * The prompts the person sent, from transcript lines (all of a session's, or
 * only the lines holding TRANSCRIPT_MARK).
 */
export function parseTranscript(text: string, sessionId: string): PromptEntry[] {
  const entries: PromptEntry[] = []

  for (const [index, row] of rowsOf(text)) {
    const origin = row.origin
    if (row.type !== 'user' || row.isMeta === true) continue
    if (!isRow(origin) || origin.kind !== 'human') continue
    const message = row.message
    const prompt = promptTextOf(isRow(message) ? message.content : undefined)
    const timestamp = typeof row.timestamp === 'string' ? Date.parse(row.timestamp) : NaN
    if (prompt === undefined || Number.isNaN(timestamp)) continue

    entries.push({
      id: `t:${sessionId}:${typeof row.uuid === 'string' ? row.uuid : index}`,
      text: prompt,
      timestamp,
      project: projectOf(typeof row.cwd === 'string' ? row.cwd : ''),
      sessionId,
      source: 'transcript',
    })
  }

  return entries
}

/** Splits `grep --null -H` output into each file's matching lines. */
export function splitGrepOutput(stdout: string): Map<string, string> {
  const lines = new Map<string, string[]>()

  for (const line of stdout.split('\n')) {
    const cut = line.indexOf('\0')
    if (cut < 0) continue
    const path = line.slice(0, cut)
    lines.set(path, [...(lines.get(path) ?? []), line.slice(cut + 1)])
  }

  return new Map([...lines].map(([path, found]) => [path, found.join('\n')]))
}

/** Whitespace-separated terms, all of which the text or project must hold. */
export function filterEntries(
  entries: readonly PromptEntry[],
  query: string,
  project?: string,
): PromptEntry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(term => term !== '')

  return entries.filter(entry => {
    if (project !== undefined && entry.project !== project) return false
    const haystack = `${entry.text}\n${entry.project}`.toLowerCase()

    return terms.every(term => haystack.includes(term))
  })
}

const pad = (n: number) => String(n).padStart(2, '0')

/** The local day a timestamp falls on, as `YYYY-MM-DD`: what rows group by. */
export function dayOf(timestamp: number): string {
  const date = new Date(timestamp)

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The local time of day, `HH:mm`. */
export function timeOf(timestamp: number): string {
  const date = new Date(timestamp)

  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/** A day's heading: 今日, 昨日, or the date (with the year when not this year). */
export function dayLabel(timestamp: number, now: number): string {
  const day = dayOf(timestamp)
  if (day === dayOf(now)) return '今日'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (day === dayOf(yesterday.getTime())) return '昨日'

  const date = new Date(timestamp)
  const year = date.getFullYear() === new Date(now).getFullYear() ? '' : `${date.getFullYear()}年`

  return `${year}${date.getMonth() + 1}月${date.getDate()}日（${WEEKDAYS[date.getDay()]}）`
}

/** A project's short name; the desktop app's per-session folders read as one. */
export const projectName = (project: string) =>
  project.includes('/scratch-workspaces/')
    ? 'scratch'
    : project.replace(/\/+$/, '').split('/').pop() || '-'

const isWide = (code: number) =>
  (code >= 0x1100 && code <= 0x115f) ||
  (code >= 0x2e80 && code <= 0xa4cf) ||
  (code >= 0xac00 && code <= 0xd7a3) ||
  (code >= 0xf900 && code <= 0xfaff) ||
  (code >= 0xfe30 && code <= 0xfe4f) ||
  (code >= 0xff00 && code <= 0xff60) ||
  (code >= 0xffe0 && code <= 0xffe6) ||
  (code >= 0x1f300 && code <= 0x1faff) ||
  (code >= 0x20000 && code <= 0x3fffd)

/** Terminal cells `text` takes, counting CJK as two. */
export function widthOf(text: string): number {
  let width = 0
  for (const char of text) width += isWide(char.codePointAt(0) ?? 0) ? 2 : 1

  return width
}

/** Cuts `text` to `columns` terminal cells, counting CJK as two. */
export function truncate(text: string, columns: number): string {
  let used = 0
  let out = ''

  for (const char of text) {
    const width = isWide(char.codePointAt(0) ?? 0) ? 2 : 1
    if (used + width > columns - 1) return `${out}…`
    used += width
    out += char
  }

  return out
}

/** Pads or cuts `text` to exactly `columns` cells. */
export function fit(text: string, columns: number): string {
  const cut = widthOf(text) > columns ? truncate(text, columns) : text

  return cut + ' '.repeat(Math.max(0, columns - widthOf(cut)))
}

/** A prompt on one line: each line break drawn as ⏎. */
export const oneLine = (text: string) => text.trim().replace(/\s*\n\s*/g, ' ⏎ ')

export type Segment = { text: string; isMatch: boolean }

/** Splits `text` into runs, marking the ones a term of `query` matches. */
export function highlight(text: string, query: string): Segment[] {
  const terms = query.toLowerCase().split(/\s+/).filter(term => term !== '')
  const lower = text.toLowerCase()
  if (terms.length === 0 || lower.length !== text.length) return [{ text, isMatch: false }]

  const ranges: [number, number][] = []
  for (const term of terms) {
    for (let at = lower.indexOf(term); at >= 0; at = lower.indexOf(term, at + term.length)) {
      ranges.push([at, at + term.length])
    }
  }
  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const [start, end] of ranges) {
    const last = merged.at(-1)
    if (last && start <= last[1]) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }

  const segments: Segment[] = []
  let cursor = 0
  for (const [start, end] of merged) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), isMatch: false })
    segments.push({ text: text.slice(start, end), isMatch: true })
    cursor = end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), isMatch: false })

  return segments
}

/** Theme colors a project label takes, so they read in light and dark alike. */
const PROJECT_COLORS = ['suggestion', 'success', 'warning', 'claude', 'merged', 'permission', 'planMode', 'ide'] as const

/** The same project always gets the same color. */
export function projectColor(name: string): (typeof PROJECT_COLORS)[number] {
  let hash = 0
  for (const char of name) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0

  return PROJECT_COLORS[hash % PROJECT_COLORS.length] ?? 'suggestion'
}
