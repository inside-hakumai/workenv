set number                    " 行番号を表示
set autoindent                " 改行時に自動でインデント
set tabstop=2                 " タブを2文字のスペースに変換
set shiftwidth=2              " 自動インデント時にスペースを2つ入力
set expandtab                 " タブ入力をを空白に変換
set list                      " 不可視文字を表示
set ruler                     " カーソルの位置を表示
set cursorline                " カーソル行の背景色を変える

" 'set line' で表示された行番号列の色の設定
hi CursorLineNr ctermbg=16 ctermfg=grey

" Include dein script
source ~/.config/nvim/dein.vim

let g:airline_powerline_fonts = 1
