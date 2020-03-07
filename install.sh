#!/bin/bash

set -eu

if ! (hash brew 2>/dev/null) ; then
  # TODO: 途中でエンターキーの押下とパスワード入力を要求されるので自動化したい
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
fi

brew install git anyenv tmux zsh fish

if [ ! -e ~/workspace/Env ] ; then
  git clone https://github.com/inside-hakumai/Env.git ~/workspace/Env
  cd ~/workspace/Env
else
  cd ~/workspace/Env
  git checkout master
  git pull origin master
fi
