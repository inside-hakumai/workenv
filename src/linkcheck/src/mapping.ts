import path from "node:path";
import os from "node:os";
import type { LinkEntry } from "./types.js";

export const REPO_ROOT = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
);
const HOME = os.homedir();

const src = (rel: string) => path.join(REPO_ROOT, "dist", rel);
const dest = (rel: string) => path.join(HOME, rel);

export const entries: LinkEntry[] = [
  // ── Shell ──
  { source: src("zsh/.zshrc"), target: dest(".zshrc"), kind: "file" },
  { source: src("fish/config.fish"), target: dest(".config/fish/config.fish"), kind: "file" },
  { source: src("fish/fish_plugins"), target: dest(".config/fish/fish_plugins"), kind: "file" },
  { source: src("fish/starship.toml"), target: dest(".config/fish/starship.toml"), kind: "file" },
  { source: src("tmux/.tmux.conf"), target: dest(".config/tmux/tmux.conf"), kind: "file" },

  // ── Editor / Terminal ──
  { source: src("ghostty/config"), target: dest("Library/Application Support/com.mitchellh.ghostty/config"), kind: "file" },
  { source: src("neovim/init.vim"), target: dest(".config/nvim/init.vim"), kind: "file" },
  { source: src("neovim/dein.vim"), target: dest(".config/nvim/dein.vim"), kind: "file" },

  // ── Git ──
  { source: src("git/ignore"), target: dest(".config/git/ignore"), kind: "file" },
  { source: src("git/.git_template/hooks/pre-commit"), target: dest(".git_template/hooks/pre-commit"), kind: "file" },

  // ── Misc ──
  { source: src("misc/.editorconfig"), target: dest(".editorconfig"), kind: "file" },
  { source: src("misc/.markdownlint-cli2.jsonc"), target: dest(".markdownlint-cli2.jsonc"), kind: "file" },
  { source: src("misc/mise.toml"), target: dest(".config/mise/config.toml"), kind: "file" },
  { source: src("homebrew/Brewfile"), target: dest("Brewfile"), kind: "file" },

  // ── Claude Code ──
  { source: src("ai-agent/claude/CLAUDE.md"), target: dest(".claude/CLAUDE.md"), kind: "file" },
  { source: src("ai-agent/claude/settings.json"), target: dest(".claude/settings.json"), kind: "file" },
  { source: src("ai-agent/claude/statusline-command.sh"), target: dest(".claude/statusline-command.sh"), kind: "file" },
  { source: src("ai-agent/claude/hooks/check_python_syntax.sh"), target: dest(".claude/hooks/check_python_syntax.sh"), kind: "file" },
  { source: src("ai-agent/claude/skills/tdd"), target: dest(".claude/skills/tdd"), kind: "directory" },

  // ── Codex ──
  { source: src("ai-agent/codex/config.toml"), target: dest(".codex/config.toml"), kind: "file" },
  { source: src("ai-agent/codex/AGENTS.md"), target: dest(".codex/AGENTS.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/kiro-spec-design.md"), target: dest(".codex/prompts/kiro-spec-design.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/kiro-spec-impl.md"), target: dest(".codex/prompts/kiro-spec-impl.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/kiro-spec-init.md"), target: dest(".codex/prompts/kiro-spec-init.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/kiro-spec-requirements.md"), target: dest(".codex/prompts/kiro-spec-requirements.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/kiro-spec-status.md"), target: dest(".codex/prompts/kiro-spec-status.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/kiro-spec-tasks.md"), target: dest(".codex/prompts/kiro-spec-tasks.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/kiro-steering.md"), target: dest(".codex/prompts/kiro-steering.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/kiro-steering-custom.md"), target: dest(".codex/prompts/kiro-steering-custom.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/kiro-validate-design.md"), target: dest(".codex/prompts/kiro-validate-design.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/kiro-validate-gap.md"), target: dest(".codex/prompts/kiro-validate-gap.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/kiro-validate-impl.md"), target: dest(".codex/prompts/kiro-validate-impl.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/review-pr-local-branch.md"), target: dest(".codex/prompts/review-pr-local-branch.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/review-pr-local-branch-without-test.md"), target: dest(".codex/prompts/review-pr-local-branch-without-test.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/speckit.analyze.md"), target: dest(".codex/prompts/speckit.analyze.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/speckit.checklist.md"), target: dest(".codex/prompts/speckit.checklist.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/speckit.clarify.md"), target: dest(".codex/prompts/speckit.clarify.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/speckit.constitution.md"), target: dest(".codex/prompts/speckit.constitution.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/speckit.implement.md"), target: dest(".codex/prompts/speckit.implement.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/speckit.plan.md"), target: dest(".codex/prompts/speckit.plan.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/speckit.specify.md"), target: dest(".codex/prompts/speckit.specify.md"), kind: "file" },
  { source: src("ai-agent/codex/prompts/speckit.tasks.md"), target: dest(".codex/prompts/speckit.tasks.md"), kind: "file" },

  // ── Bin ──
  { source: src("bin/24-bit-color"), target: dest("bin/24-bit-color"), kind: "file" },
  { source: src("bin/battery_status"), target: dest("bin/battery_status"), kind: "file" },
  { source: src("bin/cc-hook-runner"), target: dest("bin/cc-hook-runner"), kind: "file" },
  { source: src("bin/cputemp"), target: dest("bin/cputemp"), kind: "file" },
  { source: src("bin/dopen"), target: dest("bin/dopen"), kind: "file" },
  { source: src("bin/genmkfile"), target: dest("bin/genmkfile"), kind: "file" },
  { source: src("bin/gwm"), target: dest("bin/gwm"), kind: "file" },
  { source: src("bin/load-op-env"), target: dest("bin/load-op-env"), kind: "file" },
  { source: src("bin/rln"), target: dest("bin/rln"), kind: "file" },
  { source: src("bin/search_ai_prompts_history"), target: dest("bin/search_ai_prompts_history"), kind: "file" },
  { source: src("bin/sigint-all-panes"), target: dest("bin/sigint-all-panes"), kind: "file" },
  { source: src("bin/timeleft"), target: dest("bin/timeleft"), kind: "file" },
  { source: src("bin/tmux_seg_hostname"), target: dest("bin/tmux_seg_hostname"), kind: "file" },
];
