"dein Scripts-----------------------------
if &compatible
  set nocompatible               " Be iMproved
endif

" Required:
set runtimepath+=/Users/inside-hakumai/.cache/dein/repos/github.com/Shougo/dein.vim

" Required:
if dein#load_state('/Users/inside-hakumai/.cache/dein')
  call dein#begin('/Users/inside-hakumai/.cache/dein')

  " Let dein manage dein
  " Required:
  call dein#add('/Users/inside-hakumai/.cache/dein/repos/github.com/Shougo/dein.vim')

  " Add or remove your plugins here like this:
  "call dein#add('Shougo/neosnippet.vim')
  "call dein#add('Shougo/neosnippet-snippets')
  call dein#add('vim-airline/vim-airline')

  " Required:
  call dein#end()
  call dein#save_state()
endif

" Required:
filetype plugin indent on
syntax enable

" If you want to install not installed plugins on startup.
if dein#check_install()
  call dein#install()
endif

"End dein Scripts-------------------------
