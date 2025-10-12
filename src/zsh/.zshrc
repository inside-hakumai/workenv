
# iTerm上で特定のプロファイルを選択している場合のみ、fish shellを起動する
if [[ -o interactive ]] && [[ -z "$INTELLIJ_ENVIRONMENT_READER" ]] && [[ "$ITERM_PROFILE" == "Hakumai" ]]; then
  exec fish
fi
