#!/bin/sh
# Claude Code statusLine command

input=$(cat)

# Extract fields from JSON input
cwd=$(echo "$input" | jq -r '.cwd // .workspace.current_dir // ""')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
model=$(echo "$input" | jq -r '.model.display_name // empty')

# Icons
directory_icon="󰉋"
git_branch_icon=""
model_icon="󰚩"
context_usage_icon=""

# Shorten directory path (show last 3 components, truncate with …/)
short_dir=$(echo "$cwd" | awk -F'/' '{
  n = NF
  if (n <= 3) {
    print $0
  } else {
    print "…/" $(n-2) "/" $(n-1) "/" $n
  }
}')
# Replace $HOME with ~
home="$HOME"
short_dir=$(echo "$short_dir" | sed "s|^$home|~|")

# Git branch
git_branch=""
if git -C "$cwd" rev-parse --git-dir > /dev/null 2>&1; then
  git_branch=$(git -C "$cwd" -c core.hooksPath=/dev/null symbolic-ref --short HEAD 2>/dev/null || git -C "$cwd" -c core.hooksPath=/dev/null rev-parse --short HEAD 2>/dev/null)
fi

# Build status line
line=""

# Directory
line="${directory_icon} ${short_dir}"

# Git branch
if [ -n "$git_branch" ]; then
  line="${line} | ${git_branch_icon} ${git_branch}"
fi

# Model
if [ -n "$model" ]; then
  line="${line} | ${model_icon} ${model}"
fi

# Context usage
if [ -n "$used_pct" ]; then
  printf_pct=$(printf "%.0f" "$used_pct")
  line="${line} | ${context_usage_icon} ${printf_pct}%"
fi

echo "$line"
