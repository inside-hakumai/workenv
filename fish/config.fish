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

# プロンプトの装飾のための設定を纏めたファイルを読み込む
[ -f $__fish_config_dir/_prompt.fish ]; and source $__fish_config_dir/_prompt.fish

set -x LC_ALL en_US.UTF-8
set -x LANG en_US.UTF-8
set -x CFLAGS -I(brew --prefix openssl)/include -I(xcrun --show-sdk-path)/usr/include
set -x LDFLAGS -L(brew --prefix openssl)/lib

# standard PATH configuration
if [ -e ~/bin ]
    set -x PATH ~/bin/ $PATH
end

# Cabal（Haskellのパッケージマネージャ）のライブラリの実行ファイルにPATHを張る
if [ -e ~/.cabal/bin ]
    set -x PATH ~/.cabal/bin $PATH
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

if test "$TARGET_OS" = "MacOS"
    alias ls='ls -hGla'
else if test "$TARGET_OS" = "Linux"
    alias ls='ls -hGla --color=auto'
end

# automatically ls after cd
function cdl
    builtin cd $argv[1]; and ls -la .;
end
alias cd='cdl'

# language configuration
set -x LANG ja_JP.UTF-8

# anyenv initialization
anyenv init - fish | source

# nodenv configuration
set -x PATH $HOME/.anyenv/envs/nodenv/bin $PATH
set -x PATH $NODENV_ROOT/shims $PATH

# NODE_PATH configuration
# set -x NODE_PATH /usr/local/lib/node_modules

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
if [ -e $HOME/.nodebrew/current ]
    set -x PATH $HOME/.nodebrew/current/bin $PATH
end

# Pythonのvirtualenv使用時のプロンプト左端の(<env_name>)を非表示
set -x VIRTUAL_ENV_DISABLE_PROMPT 1

# golang configuration
set -x GOPATH "$HOME/.go"
set -x PATH $PATH $GOPATH/bin

# add Emacs Cask path
if [ -e $HOME/.cask/ ]
    set -x PATH $HOME/.cask/bin $PATH
end


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

