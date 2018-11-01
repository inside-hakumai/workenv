# execute neofetch if it is installed
if type -q neofetch
   neofetch
end

# disable "Welcome to fish, the friendly interactive shell"
set fish_greeting

# detect using OS
set uname_val (uname)
if [ "$uname_val" = 'Darwin' ]
    set TARGET_OS 'MacOS'
else if [ "$uname_val" = 'Linux' ]
    set TARGET_OS 'Linux'
else
    set TARGET_OS 'Unknown'
end

####################################
##      Common configuration      ##
####################################

# standard PATH configuration
if [ -e ~/bin ]
    set -x PATH ~/bin/ $PATH
end

# local / private config file
[ -f ~/.fishconfig.local ]; and source ~/.fishconfig.local
[ -f ~/Dropbox/configs/.fishconfig.private ]; source ~/Dropbox/configs/.fishconfig.private

# automatically launch tmux and disconnect parent shell immediatelay
if type tmux > /dev/null ^ /dev/null ; and test \( -z "$TMUX" \) -a \( ! "$TERM_PROGRAM" = "vscode" \)
    exec tmux new-session; and exit;
end

# check if emacs application path is specified
function emacs
    if [ ! -z "$EMACS_PATH" ]
        eval $EMACS_PATH -nw $argv
    else
        /usr/bin/emacs -nw $argv
    end
end

# shorthand aliases
alias o='open'
alias e='emacs'
alias eamcs='emacs'
alias gitg='git log --graph --full-history --all --color --pretty=format:"%x1b[31m%h%x09%x1b[32m%d%x1b[0m%x20%s"'

if test "$TARGET_OS" = "MacOS"
    alias ls='ls -hGla'
else if test "$TARGET_OS" = "Linux" 
    alias ls='ls -hGla --color=auto'
end

# other aliases
alias rm='trash'

# automatically ls after cd
function cdl
    builtin cd $argv[1]; and ls -la .;
end
alias cd='cdl'

# language configuration
set -x LANG ja_JP.UTF-8

# NODE_PATH configuration
set -x NODE_PATH /usr/local/lib/node_modules

# JAVA_HOME configuration
if [ -f /usr/libexec/java_home ]
    set jhome (eval /usr/libexec/java_home -v 1.8 ^ /dev/null)
    if [ $status -eq 0 ]
        set -x JAVA_HOME $jhome
    else if [ $status -eq 1 ]
        echo "Notice: Failed to set JAVA_HOME" 1>&2
    else
        echo $status
    end
end

# add colors to result of ls
set -x LSCOLORS gxfxbEaEBxxEhEhBaDaCaD

# add nodebrew path
if [ -e $HOME/.nodebrew/current ]
    set -x PATH $HOME/.nodebrew/current/bin $PATH
end

# pyenv configuration
if [ -e $HOME/.pyenv ]
    set -x PYENV_ROOT "$HOME/.pyenv"
    set -x PATH "$PYENV_ROOT/bin" $PATH
    if builtin command -v pyenv > /dev/null
        . (pyenv init - | psub)
    else
        echo "[Notice] pyenv is not installed." >&2
    end
end

# activate command line powerline pronpt
# "$POWERLINE_ROOT" is must be defined previously
set -x fish_function_path $fish_function_path "$POWERLINE_ROOT/bindings/fish"
powerline-daemon -q
powerline-setup

# make "rbenv shell"available
if [ -e $HOME/.rbenv ]
    set -x PATH "$HOME/.rbenv/bin" $PATH
    if builtin command -v rbenv > /dev/null
        . (rbenv init - | psub)
    else
        echo "[Notice] rbenv is not installed." >&2
    end
end

# add Emacs Cask path
if [ -e $HOME/.cask/ ]
    set -x PATH $HOME/.cask/bin $PATH
end

# when tmux is launched, automatically upgrade && update brew/apt every 6 hours
if [ ! -z "$TMUX" ]
    if [ "(tmux display-message -p '#{window_panes}')" = 1 ]
        if test ! -f "(HOME)/.ih-state/.brewupgradate.lock"
            echo "hoge"
            touch $HOME/.ih-state/.brewupgradate.lock
            if [ "$TARGET_OS" = "MacOS" ]
                set now (date +%s)0
                set lastupdate (stat -f %m "$HOME/.ih-state/.brewupdate")0
                set afterupdate (now) - (lastupdate)
                set exec_command "brew update; and brew upgrade; and sleep 5s; and touch $HOME/.ih-state/.brewupdate; and exit"
                set tool_name 'brew'
            else if [ "$TARGET_OS" = "Linux" ]
                set now (date +%s)0
                set lastupdate (stat -c %Y "$HOME/.ih-state/.aptupdate")0
                set afterupdate (now) - (lastupdate)
                set exec_command "sudo apt upgrade; and sudo apt update; and sleep 5s; and touch $HOME/.ih-state/.aptupdate; and exit"
                set tool_name 'apt'
            end
           
            if [ $afterupdate -gt (10 * 60 * 60 * 6) ]
                tmux rename-window default-window
                tmux split-window -h -t default-window.0
                tmux select-pane -t :.+
                tmux send-keys -t default-window.1 "$exec_command" C-m
            else
                echo "( afterupdate / 10 / 60 ) minutes after upgradating $tool_name"
            end
            \rm $HOME/.ih-state/.brewupgradate.lock
        end
    end
end

# command to kill all panes in current session of tmux
alias killpanes="tmux kill-pane -a; and exit"


alias sudo="sudo "

####################################
##  MacOS specific configuration  ##
####################################
if [ "$TARGET_OS" = "MacOS" ]
    
    # adjust aspect ratio of iTerm2 background image
    if builtin command -v bgo > /dev/null
        bgo

        # function handling a change of terminal window size
        function auto-bgo --on-variable COLUMNS
            bgo
        end     
    else
        echo "Notice: bgo command is not installed." 1>&2
    end    
end



####################################
##  Linux specific configuration  ##
####################################
if [ "$TARGET_OS" = "Linux" ]
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
end

