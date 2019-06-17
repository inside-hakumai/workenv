
# detect using OS
if [ `uname` = 'Darwin' ]; then
    TARGET_OS='MacOS'
elif [ `uname` = 'Linux' ]; then
    TARGET_OS='Linux'
else
    TARGET_OS='Unknown'
fi


####################################
##      Common configuration      ##
####################################

# standard PATH configuration
export PATH=/usr/local/bin:$PATH

# .zshrc.local（gitで管理しない端末特有の設定を管理するファイル）を取り込む
# .zshrc.private（gitで管理しないが所有端末間で共有したい設定を管理するファイル）を取り込む
# Import .zshrc.local, which stores machine-dependent configurations that should not be managed by git
# Import .zshrc.private, which stores shared configurations among machines that should not be managed by git
[ -f ~/.zshrc.local ] && source ~/.zshrc.local
[ -f ~/Dropbox/configs/.zshrc.private ] && source ~/Dropbox/configs/.zshrc.private

# aliases
alias ls='ls -hGla'
alias gitg='git log --graph --full-history --all --color --pretty=format:"%x1b[31m%h%x09%x1b[32m%d%x1b[0m%x20%s"'

# automatically ls after cd
cdl() { builtin cd $1 && ls .;}
alias cd='cdl'

# language configuration
export LANG=ja_JP.UTF-8

# NODE_PATH configuration
export NODE_PATH=/usr/local/lib/node_modules

# not distinguish between capital letters and small letter at complementation
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}'

# automatically doing a pushd at cd
setopt auto_pushd
# eliminate directory duplication
setopt pushd_ignore_dups

# command history configuration
HISTFILE=~/.zsh_history
HISTSIZE=1000000
SAVEHIST=1000000

# enable to display Japanese
setopt print_eight_bit

# disable beep
setopt no_beep

# disable flow control
setopt no_flow_control

# disable exit by Ctrl+D
setopt ignore_eof

# regard text after '#' as comment even at command line
setopt interactive_comments

# disable 'no matches found'
setopt nonomatch

# add colors to result of ls
export LSCOLORS=gxfxbEaEBxxEhEhBaDaCaD

# add nodebrew path
export PATH=$HOME/.nodebrew/current/bin:$PATH

# pyenv configuration
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
if builtin command -v pyenv > /dev/null ; then
    eval "$(pyenv init -)"
fi

# make "rbenv shell"available
export PATH="$HOME/.rbenv/bin:$PATH"
if builtin command -v rbenv > /dev/null ; then
    eval "$(rbenv init -)"
fi

# add Emacs Cask path
export PATH=$HOME/.cask/bin:$PATH

# Powerlevel9kがインストールされている場合は有効化
# Activate Powerlevel9k if installed
if [ -f ~/powerlevel9k/powerlevel9k.zsh-theme ]; then
    #TODO .zshrcがシンボリックリンクである場合しか期待通り動かない（実際のファイルである場合readlinkが何も返さない）
    source `dirname $(readlink ~/.zshrc)`/powerlevel9k.zshrc
fi

# zshのパッケージマネージャーzplugを有効化
# Activate zplug
export ZPLUG_HOME=/usr/local/opt/zplug
source $ZPLUG_HOME/init.zsh
zplug "carloscuesta/materialshell", use:materialshell, from:github, as:theme
zplug "djui/alias-tips"
zplug "zsh-users/zsh-autosuggestions"
zplug "zsh-users/zsh-history-substring-search"
zplug "zsh-users/zsh-completions"

# fzfによるコマンド履歴の検索機能を有効化
# Enable a function seraching command history by fzf
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh # ".fzf.zsh" は "$(brew --prefix)/opt/fzf/install" で生成されるファイル

# 補完機能の有効化
# enable complementation function
fpath=(`dirname $(readlink ~/.zshrc)`/completion $fpath)
autoload -Uz compinit
zstyle ':completion:*:default' menu select=2  # 矢印キーで補完候補の移動
zstyle ':completion:*' verbose yes
zstyle ':completion:*' completer _expand _complete _match _prefix _approximate _list _history
zstyle ':completion:*' list-colors ${(s.:.)LS_COLORS}
compinit


# 補完機能に関するオプション
setopt auto_param_slash
setopt mark_dirs
setopt magic_equal_subst
setopt complete_in_word
setopt always_last_prompt
setopt print_eight_bit
setopt globdots

alias sudo="sudo "

####################################
##  MacOS specific configuration  ##
####################################
if [ "$TARGET_OS" = "MacOS" ]; then
  # do nothing
  :
fi



####################################
##  Linux specific configuration  ##
####################################
if [ "$TARGET_OS" = "Linux" ]; then
    # do nothing
    :
fi
