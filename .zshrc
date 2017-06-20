# standard PATH configuration
export PATH=/usr/local/bin:$PATH

# local .zshrc file
[ -f ~/.zshrc.local ] && source ~/.zshrc.local

# shorthand aliases
alias o='open'
alias e='emacs'
alias eamcs='emacs'
alias -g L='| less'
alias -g G='| grep'
alias ls='ls -G'

# other aliases
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

# pyenv configuration
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"

# make "rbenv shell"available
export PATH="$HOME/.rbenv/bin:$PATH"
eval "$(rbenv init -)"

# add Emacs Cask path
export PATH=$HOME/.cask/bin:$PATH

# when tmux is launched, automatically 'brew upgrade && update' every 6 hours
if [ ! -z "$TMUX" ]; then
    if [ `tmux display-message -p '#{window_panes}'` = 1 ]; then
        afterupdate=$(( $(date +%s)0 - $(stat -f %m $HOME/.ih-state/.brewupdate)0 ))
        if [ $afterupdate -gt $(( 60 * 60 * 6 )) ]; then
            tmux rename-window default-window
            tmux split-window -h -t default-window.0
            tmux select-pane -t :.+
            tmux send-keys -t default-window.1 'brew upgrade && brew update && sleep 5s && touch $HOME/.ih-state/.brewupdate && exit' C-m
        else
          echo "$(( $afterupdate / 60 )) minutes after upgradating brew"
        fi
    fi
fi

# automatically launch tmux
if [ -z "$TMUX" ]; then
    tmux
fi

# command to kill all panes in current session of tmux
alias killall="tmux kill-pane -a && exit"

