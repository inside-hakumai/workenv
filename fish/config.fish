# disable "Welcome to fish, the friendly interactive shell"
set fish_greeting

set PROMPT_R_ARROW   # PowerlineFontを導入することで表示できる右向きの三角形アイコン
set PROMPT_L_ARROW   # PowerlineFontを導入することで表示できる左向きの三角形アイコン
set PROMPT_BG_BLACK_FG_WHITE (set_color -b black; and set_color white)
set PROMPT_BG_BLUE_FG_BLACK (set_color -b blue; and set_color black)
set PROMPT_BG_NORMAL_FG_BLUE (set_color -b normal; and set_color blue)
set PROMPT_COLOR_NORMAL (set_color -b normal; and set_color normal)
set pf_b (set_color black)
set pb_b (set_color -b black)
set pf_g (set_color green)
set pf_n (set_color normal)
set pf_r (set_color red)
set pb_r (set_color -b red)
set pf_y (set_color yellow)
set pf_by (set_color -o yellow)
set pb_y (set_color -b yellow)
set fish_prompt_pwd_dir_length 2

set CHECK_ICON 
set EXIT_ICON "↵"


function store_exit_code --on-event fish_prompt
  set -g RETVAL "$status"
end


function exit_code_prompt
  if [ $RETVAL -eq 0 ]
    printf "$pf_b$PROMPT_L_ARROW$pf_g$pb_b %s  $pf_n" $CHECK_ICON
  else
    printf "$pf_r$PROMPT_L_ARROW$pf_by$pb_r %s %s $pf_n" $RETVAL $EXIT_ICON
  end
end


function fish_right_prompt --description 'Write out the right prompt'
    printf "%s" (exit_code_prompt)
end


function fish_prompt --description 'Write out the prompt'
    printf "$PROMPT_BG_BLACK_FG_WHITE %s $PROMPT_BG_BLUE_FG_BLACK$PROMPT_R_ARROW %s $PROMPT_BG_NORMAL_FG_BLUE$PROMPT_R_ARROW$PROMPT_COLOR_NORMAL " (whoami) (prompt_pwd)
end

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
set -x CFLAGS -I(brew --prefix openssl)/include -I(xcrun --show-sdk-path)/usr/include
set -x LDFLAGS -L(brew --prefix openssl)/lib

# standard PATH configuration
if [ -e ~/bin ]
    set -x PATH ~/bin/ $PATH
end

# local / private config file
[ -f ~/.fishconfig.local ]; and source ~/.fishconfig.local
[ -f ~/Dropbox/configs/.fishconfig.private ]; source ~/Dropbox/configs/.fishconfig.private

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
    set jhome (eval /usr/libexec/java_home -v 11 ^ /dev/null)
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
    # set -x PATH "$PYENV_ROOT/bin" $PATH
    if builtin command -v pyenv > /dev/null
        status --is-interactive; and source (pyenv init -| psub)
    else
        echo "[Notice] pyenv is not installed." >&2
    end
end

# golang configuration
set -x GOPATH "$HOME/.go"
set -x PATH $PATH $GOPATH/bin

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

