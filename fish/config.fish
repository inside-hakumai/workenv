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

set -x LC_ALL en_US.UTF-8
set -x LANG en_US.UTF-8

# standard PATH configuration
set -g fish_user_paths ./bin $fish_user_paths
[ -e ~/bin ]; and set -g fish_user_paths ~/bin/ $fish_user_paths
[ -e /usr/local/sbin ]; set -g fish_user_paths /usr/local/sbin $fish_user_paths

# Cabal（Haskellのパッケージマネージャ）のライブラリの実行ファイルにPATHを張る
if [ -e ~/.cabal/bin ]
    set -g fish_user_paths ~/.cabal/bin $fish_user_paths
end

# local / private config file
[ -f ~/.fishconfig.local ]; and source ~/.fishconfig.local
[ -f ~/Dropbox/configs/.fishconfig.private ]; and source ~/Dropbox/configs/.fishconfig.private

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
alias restart='exec $SHELL -l'
alias gitg='git log --graph --full-history --all --color --pretty=format:"%x1b[31m%h%x09%x1b[32m%d%x1b[0m%x20%s"'

if test -f exa
    alias ls='exa -laFg --icons'
else
    test "$TARGET_OS" = "MacOS"; and alias ls='exa -laFg --icons'
    test "$TARGET_OS" = "Linux"; and alias ls='ls -hGla --color=auto'
end

# automatically ls after cd
function cdl
    builtin cd $argv[1]; and ls -la .;
end
alias cd='cdl'

# language configuration
set -x LANG ja_JP.UTF-8

# JAVA_HOME configuration
if [ -f /usr/libexec/java_home ]
    set jhome (eval /usr/libexec/java_home -v 11 ^ /dev/null)
    if [ $status -eq 0 ]
        set -x JAVA_HOME $jhome
    end
end

# add colors to result of ls
set -x LSCOLORS gxfxbEaEBxxEhEhBaDaCaD

# add nodebrew path
[ -e $HOME/.nodebrew/current ]; and set -g fish_user_paths $HOME/.nodebrew/current/bin $fish_user_paths

# Pythonのvirtualenv使用時のプロンプト左端の(<env_name>)を非表示
set -x VIRTUAL_ENV_DISABLE_PROMPT 1

# add Emacs Cask path
[ -e $HOME/.cask/ ]; and set -g fish_user_paths $HOME/.cask/bin $fish_user_paths

rtx activate fish | source

alias sudo="sudo "

####################################
##  MacOS specific configuration  ##
####################################
if [ "$TARGET_OS" = "MacOS" ]

end



####################################
##  Linux specific configuration  ##
####################################
if [ "$TARGET_OS" = "Linux" ]

end

starship init fish | source
