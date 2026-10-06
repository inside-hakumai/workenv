export type PromptHistoryScope = 'all' | 'project'

declare module 'claude-code' {
  interface PluginState {
    'prompt-history': {
      query: string
      scope: PromptHistoryScope
      /** Where the shown page starts in the matched prompts. */
      offset: number
      revision: number
      problem: string
    }
  }
}
