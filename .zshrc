# local .zshrc file
[ -f ~/.zshrc.local ] && source ~/.zshrc.local

# aliases
alias o='open'
alias e='emacs'
alias eamcs='emacs'
alias -g L='| less'
alias -g G='| grep'
alias ls='ls -G'
alias rm='trash'
alias emacs='emacs -nw'

# cd and ls
cdl() { builtin cd $1 && ls -la .;}
alias cd='cdl'

# language configuration
export LANG=ja_JP.UTF-8

# NODE_PATH configuration
export NODE_PATH=/usr/local/lib/node_modules

# JAVA_HOME configuration
export JAVA_HOME=$(/usr/libexec/java_home -v 1.8)

# enable complementation function
autoload -Uz compinit
compinit

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

# emacs-like keybind
bindkey -e

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

# activate command line powerline pronpt
. $POWERLINE_ROOT/bindings/zsh/powerline.zsh

# disable 'no matches found'
setopt nonomatch

# add colors to result of ls
export LSCOLORS=gxfxbEaEBxxEhEhBaDaCaD

# vpsssh
alias vpsssh='ssh -i ~/.ssh/ConoHa/id_rsa_conoha -p 4715 hakumai164@insidehakumai.net'

# add nodebrew path
export PATH=$HOME/.nodebrew/current/bin:$PATH

# make "pyenv shell" available
eval "$(pyenv init -)"

# make "rbenv shell"available
eval "$(rbenv init -)"

# add Emacs Cask path
export PATH=$HOME/.cask/bin:$PATH
