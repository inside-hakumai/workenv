# fish shellを起動する
if [[ -o interactive ]] && [[ -z "$INTELLIJ_ENVIRONMENT_READER" ]]; then
  exec fish
fi
