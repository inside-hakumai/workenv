
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

# local / private .zshrc file
[ -f ~/.zshrc.local ] && source ~/.zshrc.local
[ -f ~/Dropbox/configs/.zshrc.private ] && source ~/Dropbox/configs/.zshrc.private

# check if emacs application path is specified
emacs() {
    if [ ! -z "$EMACS_PATH" ] ; then
	$EMACS_PATH -nw $@
    else
	/usr/bin/emacs -nw $@
    fi
}

# shorthand aliases
alias o='open'
alias e='emacs'
alias eamcs='emacs'
alias -g L='| less'
alias -g G='| grep'
alias ls='ls -hGla'

# other aliases
alias rm='trash'

# automatically ls after cd
cdl() { builtin cd $1 && ls -la .;}
alias cd='cdl'

# language configuration
export LANG=ja_JP.UTF-8

# NODE_PATH configuration
export NODE_PATH=/usr/local/lib/node_modules

# JAVA_HOME configuration
jhome=$(/usr/libexec/java_home -v 1.8) 2>/dev/null
if [ $? -eq 0 ] ; then
    export JAVA_HOME=$jhome
elif [ $? -eq 1 ] ; then
    echo "[Notice] Failed to set JAVA_HOME" >&2
else
    echo $?
fi

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
else
    echo "[Notice] pyenv is not installed." >&2
fi


# activate command line powerline pronpt
. $POWERLINE_ROOT/bindings/zsh/powerline.zsh

# make "rbenv shell"available
export PATH="$HOME/.rbenv/bin:$PATH"
if builtin command -v rbenv > /dev/null ; then
    eval "$(rbenv init -)"
else
    echo "[Notice] rbenv is not installed." >&2
fi


# add Emacs Cask path
export PATH=$HOME/.cask/bin:$PATH

# when tmux is launched, automatically upgrade && update brew/apt every 6 hours
if [ ! -z "$TMUX" ]; then
    if [ "$(tmux display-message -p '#{window_panes}')" = 1 ]; then
        if [ ! -f "$HOME/.ih-state/.brewupgradate.lock" ]; then
           touch $HOME/.ih-state/.brewupgradate.lock
	       if [ "$TARGET_OS" = "MacOS" ]; then
	           afterupdate=$(( $(date +%s)0 - $(stat -f %m "$HOME/.ih-state/.brewupdate")0 ))
	           exec_command="brew update && brew upgrade && sleep 5s && touch $HOME/.ih-state/.brewupdate && exit"
	           tool_name='brew'
	       elif [ "$TARGET_OS" = "Linux" ]; then
	           afterupdate=$(( $(date +%s)0 - $(stat -c %Y "$HOME/.ih-state/.aptupdate")0 ))
	           exec_command="sudo apt upgrade && sudo apt update && sleep 5s && touch $HOME/.ih-state/.aptupdate && exit"
	           tool_name='apt'
	       fi
           
           if [[ $afterupdate -gt $(( 10 * 60 * 60 * 6 )) ]]; then
               tmux rename-window default-window
               tmux split-window -h -t default-window.0
               tmux select-pane -t :.+
               tmux send-keys -t default-window.1 "$exec_command" C-m
           else
               echo "$(( afterupdate / 10 / 60 )) minutes after upgradating $tool_name"
           fi
           \rm $HOME/.ih-state/.brewupgradate.lock
        fi
    fi
fi

# automatically launch tmux
if [ -z "$TMUX" ]; then
    tmux
fi

# command to kill all panes in current session of tmux
alias killpanes="tmux kill-pane -a && exit"


alias sudo="sudo "

####################################
##  MacOS specific configuration  ##
####################################
if [ "$TARGET_OS" = "MacOS" ]; then
    
    # adjust aspect ratio of iTerm2 background image
    if builtin command -v bgo > /dev/null ; then
        bgo
    else
        echo "[Notice] bgo command is not installed." >&2
    fi
    
fi



####################################
##  Linux specific configuration  ##
####################################
if [ "$TARGET_OS" = "Linux" ]; then
    # log apt install
    # APT_LOG_DEST_FILE="$HOME/.apt_log"
    # apt_install_auto_log() {
    #     echo "$1"
    #     if [ "$1" = 'install' ]; then
    # 	echo huga
    # # 	#	\apt $@ && echo "[$(date +'%Y/%m/%d %H:%M:%S')] ${@:2}" >> $APT_LOG_DEST_FILE
    # 	\apt $@
    # 	echo $?
    # 	echo hoge
    #     else
    # 	\apt $@
    #     fi
    # }
    # alias apt='zsh -c "$(functions apt_install_auto_log); $@"'
    :
fi
