# ディレクトリが存在し、まだPATHに含まれていない場合に追加
add_to_path() {
  local dir="$1"
  if [ -d "$dir" ] && (( ${path[(I)$dir]} == 0 )); then
    path+=("$dir")
  fi
}

# PATH設定
typeset -U path
add_to_path "$HOME/bin"
add_to_path "/usr/local/sbin"
add_to_path "$HOME/.local/bin"


# Safe-chain Zsh initialization script
# https://github.com/AikidoSec/safe-chain
if [ -f ~/.safe-chain/scripts/init-posix.sh ]; then
  source ~/.safe-chain/scripts/init-posix.sh 
fi


# iTerm上で特定のプロファイルを選択している場合のみ、fish shellを起動する
if [[ -o interactive ]] && [[ -z "$INTELLIJ_ENVIRONMENT_READER" ]] && [[ "$ITERM_PROFILE" == "Hakumai" || -n "$GHOSTTY_BIN_DIR" ]] && [[ "$CURSOR_AGENT" != "1" ]]; then
  exec fish
  return
fi

########################################################
## 以下、上記の条件に合致せずzsh shellのまま続行される場合の処理
########################################################

eval "$(mise activate zsh)"
