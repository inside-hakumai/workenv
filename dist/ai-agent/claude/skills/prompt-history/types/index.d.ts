export type PromptHistoryScope = 'all' | 'project'

declare module 'claude-code' {
  interface PluginState {
    'prompt-history': {
      query: string
      scope: PromptHistoryScope
      limit: number
      revision: number
      problem: string
    }
  }
}
