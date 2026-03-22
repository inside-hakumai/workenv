#!/bin/bash
# Claude Code statusLine command

input=$(cat)

# Extract all fields from JSON in a single jq call
eval "$(echo "$input" | jq -r '
  @sh "cwd=\(.cwd // .workspace.current_dir // "")",
  @sh "used_pct=\(.context_window.used_percentage // "")",
  @sh "model=\(.model.display_name // "")",
  @sh "five_h_pct=\(.rate_limits.five_hour.used_percentage // "")",
  @sh "five_h_resets=\(.rate_limits.five_hour.resets_at // "")",
  @sh "seven_d_pct=\(.rate_limits.seven_day.used_percentage // "")",
  @sh "seven_d_resets=\(.rate_limits.seven_day.resets_at // "")"
')"

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
if [[ "$short_dir" == "$HOME"* ]]; then
  short_dir="~${short_dir#"$HOME"}"
fi

# Git branch
git_branch=""
if git -C "$cwd" rev-parse --git-dir > /dev/null 2>&1; then
  git_branch=$(git -C "$cwd" -c core.hooksPath=/dev/null symbolic-ref --short HEAD 2>/dev/null || git -C "$cwd" -c core.hooksPath=/dev/null rev-parse --short HEAD 2>/dev/null)
fi

# Build status line (line 1)
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

# --- Line 2: Rate limit usage gauges ---

# ANSI colors
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
RESET='\033[0m'

# Build a colored progress bar gauge
# Usage: build_gauge <used_percentage>
# Output: colored "██████░░░░ 60%" string
build_gauge() {
  local pct_raw="$1"
  local pct
  pct=$(printf "%.0f" "$pct_raw" 2>/dev/null) || return 1

  # Clamp to 0-100
  (( pct < 0 )) && pct=0
  (( pct > 100 )) && pct=100

  # Color based on threshold: <50% green, <90% yellow, >=90% red
  local color
  if (( pct >= 90 )); then
    color="$RED"
  elif (( pct >= 50 )); then
    color="$YELLOW"
  else
    color="$GREEN"
  fi

  # Build bar (width=20)
  local filled=$(( pct * 20 / 100 ))
  local empty=$(( 20 - filled ))
  local bar=""
  (( filled > 0 )) && bar=$(printf "%${filled}s" | tr ' ' '█')
  (( empty > 0 )) && bar="${bar}$(printf "%${empty}s" | tr ' ' '░')"

  printf '%b' "${color}${bar}${RESET} ${pct}%"
}

# Format remaining time until reset
# Usage: format_remaining <resets_at_epoch>
# Output: "(2d)" or "(10h)"
format_remaining() {
  local resets_at="$1"
  local now
  now=$(date +%s)
  local remaining=$(( resets_at - now ))

  if (( remaining <= 0 )); then
    return
  fi

  local hours=$(( remaining / 3600 ))
  if (( hours >= 24 )); then
    echo "($(( hours / 24 ))d)"
  else
    echo "(${hours}h)"
  fi
}

# Build line 2 segments
segments=""

if [ -n "$five_h_pct" ]; then
  gauge=$(build_gauge "$five_h_pct") || gauge=""
  if [ -n "$gauge" ]; then
    remaining=""
    [ -n "$five_h_resets" ] && remaining=" $(format_remaining "$five_h_resets")"
    segments="5h: ${gauge}${remaining}"
  fi
fi

if [ -n "$seven_d_pct" ]; then
  gauge=$(build_gauge "$seven_d_pct") || gauge=""
  if [ -n "$gauge" ]; then
    remaining=""
    [ -n "$seven_d_resets" ] && remaining=" $(format_remaining "$seven_d_resets")"
    if [ -n "$segments" ]; then
      segments="${segments} | 7d: ${gauge}${remaining}"
    else
      segments="7d: ${gauge}${remaining}"
    fi
  fi
fi

# Only print line 2 if there is rate limit data
if [ -n "$segments" ]; then
  printf '%s\n' "$segments"
fi
