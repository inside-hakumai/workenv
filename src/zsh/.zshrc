
# iTerm上で特定のプロファイルを選択している場合のみ、fish shellを起動する
if [[ -o interactive ]] && [[ -z "$INTELLIJ_ENVIRONMENT_READER" ]] && [[ "$ITERM_PROFILE" == "Hakumai" ]]; then
  exec fish
  return
fi

########################################################
## 以下、上記の条件に合致せずzsh shellのまま続行される場合の処理
########################################################

eval "$(mise activate zsh)"
