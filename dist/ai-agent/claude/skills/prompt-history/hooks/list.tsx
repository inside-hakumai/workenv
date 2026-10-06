import type { ClientElements, ClientModule, ClientPointerEvent } from 'claude-code'

// The list and its preview, drawn by the surface itself: the pointer over a
// row picks the prompt the preview shows, with no round trip to the hooks
// module; a click or Enter posts the prompt to insert.

export type Segment = { text: string; isMatch: boolean }

/** One line of the list: every item takes exactly one row of the region. */
export type ListItem =
  | { kind: 'heading'; text: string }
  | { kind: 'gap' }
  | { kind: 'row'; id: string; time: string; line: Segment[]; project: string; color: string }

export type Preview = { heading: string; lines: Segment[][]; hidden: number }

export type ListProps = {
  /** Changes with the query, scope and page: a new page drops the pick. */
  page: string
  items: ListItem[]
  /** Blank lines after the items, so a short page takes a whole page's room. */
  fill: number
  /** The picked row's background, as this surface resolves colors. */
  pickedBackground: string
  previews: Record<string, Preview>
  /** What Enter in the search field inserts while nothing is picked. */
  firstId: string | null
  emptyText: string | null
}

/** What the module posts to the hooks module. */
export type ListMessage = { type: 'pick'; id: string } | { type: 'insert'; id: string }

type State = { page: string; picked: string | undefined }

const highlighted = (Text: ClientElements['Text'], parts: Segment[]) =>
  parts.map(part =>
    part.isMatch ? (
      <Text weight="semibold" color="claude">
        {part.text}
      </Text>
    ) : (
      part.text
    ),
  )

const List: ClientModule<ListProps, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  const rows = props.items.flatMap(item => (item.kind === 'row' ? [item.id] : []))
  // a pick belongs to the page it was made on
  const picked = surface.state?.page === props.page ? surface.state.picked : undefined
  const shown = picked ?? props.firstId ?? undefined

  const pick = (id: string) => {
    if (id === picked) return
    surface.setState({ page: props.page, picked: id })
    surface.post({ type: 'pick', id })
  }

  surface.onPointer((event: ClientPointerEvent) => {
    // the pointer resting on the fill or the preview keeps the last row it
    // passed: neither is an item
    const item = props.items[event.y]
    if (item?.kind !== 'row') return
    if (event.type === 'move' || event.type === 'enter') pick(item.id)
    if (event.type === 'down' && event.button === 'left') surface.post({ type: 'insert', id: item.id })
  })

  surface.onKey(event => {
    const at = shown === undefined ? -1 : rows.indexOf(shown)
    if (event.key === 'down' && at + 1 < rows.length) pick(rows[at + 1] ?? '')
    if (event.key === 'up' && at > 0) pick(rows[at - 1] ?? '')
    if (event.key === 'return' && shown !== undefined) surface.post({ type: 'insert', id: shown })
  })

  const preview = shown === undefined ? undefined : props.previews[shown]

  return (
    <Box flexDirection="column">
      {props.emptyText !== null && <Text dimColor>{props.emptyText}</Text>}
      {props.items.map(item => {
        if (item.kind === 'gap') return <Text> </Text>
        if (item.kind === 'heading') {
          return (
            <Text dimColor bold>
              {item.text}
            </Text>
          )
        }
        const isShown = item.id === shown

        return (
          <Box flexDirection="row" columnGap={2} backgroundColor={isShown ? props.pickedBackground : undefined}>
            <Text dimColor={!isShown} mono>
              {item.time}
            </Text>
            <Box flexGrow={1} flexShrink={1}>
              <Text wrap="truncate-end">
                {highlighted(Text, item.line)}
              </Text>
            </Box>
            <Text color={item.color}>{item.project}</Text>
          </Box>
        )
      })}
      {Array.from({ length: props.fill }, () => (
        <Text> </Text>
      ))}

      {preview && (
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor={picked ? 'claude' : undefined}
          borderDimColor={!picked}
          paddingX={1}
        >
          <Text dimColor>
            {preview.heading} · {picked ? 'マウスの位置（クリックで挿入）' : '先頭（Enter で挿入）'}
          </Text>
          {preview.lines.map(line => (
            <Text>{highlighted(Text, line)}</Text>
          ))}
          {preview.hidden > 0 && <Text dimColor>…ほか {preview.hidden} 行</Text>}
        </Box>
      )}
    </Box>
  )
}

export default List
