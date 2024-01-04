# PATH設定
[ -e ~/bin ]; and fish_add_path ~/bin
[ -e /usr/local/sbin ]; fish_add_path /usr/local/sbin
[ -e ~/.cabal/bin ]; fish_add_path ~/.cabal/bin

# local / private config file
[ -f ~/.fishconfig.local ]; and source ~/.fishconfig.local
[ -f ~/Dropbox/configs/.fishconfig.private ]; and source ~/Dropbox/configs/.fishconfig.private


if status is-interactive

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

    # shorthand aliases
    alias o='open'
    alias e='emacs'
    alias eamcs='emacs'
    alias restart='exec $SHELL -l'
    alias gitg='git log --graph --full-history --all --color --pretty=format:"%x1b[31m%h%x09%x1b[32m%d%x1b[0m%x20%s"'

    if type exa > /dev/null
        alias ls='exa -laFg --icons'
    else
        test "$TARGET_OS" = "MacOS"; and alias ls='ls -laFg --icons'
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

    # Pythonのvirtualenv使用時のプロンプト左端の(<env_name>)を非表示
    set -x VIRTUAL_ENV_DISABLE_PROMPT 1

    if type mise > /dev/null
        mise activate fish | source
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



    if type starship > /dev/null
        starship init fish | source
    end

end