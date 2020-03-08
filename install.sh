#!/bin/bash

set -eu

function homebrew() {
  if ! (hash brew 2>/dev/null) ; then
    # TODO: 途中でエンターキーの押下とパスワード入力を要求されるので自動化したい
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"
  fi
}

function homebrew_libs() {
  brew update
  brew upgrade

  brew ls --versions git    > /dev/null || brew install git
  brew ls --versions anyenv > /dev/null || brew install anyenv
  brew ls --versions tmux   > /dev/null || brew install tmux
  brew ls --versions zsh    > /dev/null || brew install zsh
}

function repository() {
  if [ ! -e ~/workspace/Env ] ; then
    git clone https://github.com/inside-hakumai/Env.git ~/workspace/Env
    cd ~/workspace/Env
  else
    cd ~/workspace/Env
    git checkout master
    git pull origin master
  fi
}

function install_fish() {
  brew ls --versions fish   > /dev/null || brew install fish

  mkdir -m700 "$HOME/.config"
  mkdir -m700 "$HOME/.config/fish"
  ln -s "$HOME/workspace/Env/fish/config.fish" "$HOME/.config/fish/config.fish"
  ln -s "$HOME/workspace/Env/fish/fishfile" "$HOME/.config/fish/fishfile"
  ln -s "$HOME/workspace/Env/fish/_prompt.fish" "$HOME/.config/fish/_prompt.fish"

  curl https://git.io/fisher --create-dirs -sLo ~/.config/fish/functions/fisher.fish
  fish -c "fisher"
}


"$@"