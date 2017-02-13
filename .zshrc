# 言語設定
export LANG=ja_JP.UTF-8

# NODE_PATHの設定
export NODE_PATH=/usr/local/lib/node_modules

# JAVA_HOMEの設定
export JAVA_HOME=$(/usr/libexec/java_home -v 1.8)

# 補完機能を有効にする
autoload -Uz compinit
compinit

# cd したら自動的にpushdする
setopt auto_pushd
# 重複したディレクトリを追加しない
setopt pushd_ignore_dups


# グローバルエイリアス
alias -g L='| less'
alias -g G='| grep'

# ヒストリの設定
HISTFILE=~/.zsh_history
HISTSIZE=1000000
SAVEHIST=1000000


# emacs 風キーバインドにする
bindkey -e


# 日本語ファイル名を表示可能にする
setopt print_eight_bit

# beep を無効にする
setopt no_beep

# フローコントロールを無効にする
setopt no_flow_control

# Ctrl+Dでzshを終了しない
setopt ignore_eof

# '#' 以降をコメントとして扱う
setopt interactive_comments

# vim:set ft=zsh :


## 以下、手動で追記

alias ls='ls -G'
cdl() { cd $1 && ls -la .;}
alias cd='cdl'
zstyle ':completion:*' list-colors 'di=32'

export PATH=$PATH:~/Library/Python/2.7/bin
export PATH=$PATH:/usr/local/sbin
export PATH=$PATH:~/.composer/vendor/bin
export localhost=/usr/local/var/www/htdocs
export class=~/Dropbox/Documents/15/
powerline-daemon -q
. ~/Library/Python/2.7/lib/python/site-packages/powerline/bindings/zsh/powerline.zsh

export PATH=$PATH:~/bin

# brewの警告除去用
alias brew="env PATH=${PATH//Users/inside_rice164/Library/Python/2.7/bin:/} brew"

# 補完で小文字と大文字を区別しない
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}'

setopt nonomatch

export LSCOLORS=gxfxbEaEBxxEhEhBaDaCaD

alias eamcs='emacs'
alias e='emacs'

alias rm='trash'

# Xerces2
export CLASSPATH=.:$HOME/lib/java/isorelax.jar:$HOME/lib/java/jing.jar:$HOME/lib/java/msv.jar:$HOME/lib/java/relaxngDatatype.jar:$HOME/lib/java/resolver.jar:$HOME/lib/java/saxon.jar:$HOME/lib/java/serializer.jar:$HOME/lib/java/trang.jar:$HOME/lib/java/xalan.jar:$HOME/lib/java/xalansamples.jar:$HOME/lib/java/xercesImpl.jar:$HOME/lib/java/xercesSamples.jar:$HOME/lib/java/xml-apis.jar:$HOME/lib/java/xmlParserAPIs.jar:$HOME/lib/java/xsdlib.jar

# vpsssh
alias vpsssh='ssh -i ~/.ssh/ConoHa/id_rsa_conoha -p 4715 hakumai164@insidehakumai.net'

# add nodebrew path
export PATH=$HOME/.nodebrew/current/bin:$PATH

# make "pyenv shell" available
eval "$(pyenv init -)"

# make "rbenv shell"available
eval "$(rbenv init -)"

# set slack-hubot token
HUBOT_SLACK_TOKEN=xoxb-38412845716-DE5Cc4fTskJD54sjDIP0ADsz
