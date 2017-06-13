#!/bin/sh

cd `dirname $0`
scriptname=${0##*/}
filepath=`pwd`/$scriptname
zshfilepath=`pwd`"/.zshrc"

# link .zshrc
if [ -f ~/.zshrc ]; then
    mv ~/.zshrc ~/.zshrc_old
    echo 'current .zshrc was saved as ".zshrc_old".'
fi

ln -s `$zshfilepath` ~/.zshrc
if [ $? = 0 ]; then
    echo '.zshrc was linkd to "~/.zshrc".'
else
    echo 'linking .zshrc was failed.'
fi

