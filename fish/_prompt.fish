set PROMPT_R_TRIANGLE   # PowerlineFontを導入することで表示できる右向きの三角形アイコン
set PROMPT_L_TRIANGLE   # PowerlineFontを導入することで表示できる左向きの三角形アイコン
set PROMPT_R_ARROW   # PowerlineFontを導入することで表示できる「>」のようなアイコン
set PYTHON_ICON   # PowerlineFontを導入することで表示できるPythonのロゴマーク
set GIT_BRANCH_ICON   # # PowerlineFontを導入することで表示できるVCSのブランチのアイコン

set fish_prompt_pwd_dir_length 2

set CHECK_ICON 
set EXIT_ICON "↵"

# プロンプトに表示させる項目（<実行コマンド>/<背景色>/<文字色>）左から順に表示
set prompt_fragments "whoami/black/white" "python_virtual_env_prompt/red/white" "prompt_pwd/blue/black" "git_current_branch_prompt/yellow/black"

function exit_code_prompt
  if [ $RETVAL -eq 0 ]
    echo -n -s (set_color black) "$PROMPT_L_TRIANGLE" (set_color green) (set_color -b black) " $CHECK_ICON  " (set_color normal)
  else
    echo -n -s (set_color red) "$PROMPT_L_TRIANGLE" (set_color -o yellow) (set_color -b red) " $RETVAL $EXIT_ICON " (set_color normal)
  end
end

function python_virtual_env_prompt
  if set -q VIRTUAL_ENV
    echo -n -s $PYTHON_ICON "  " (basename $VIRTUAL_ENV)
  end
end

function git_current_branch_prompt
  set branch_name (git symbolic-ref --short HEAD 2> /dev/null)
  if [ $status -eq 0 ]
    echo $GIT_BRANCH_ICON $branch_name
  end
end

function prompt_border
  set next_bg_color $argv[1]
  if set -q current_bg_color
    set_color -b $next_bg_color
    set_color $current_bg_color
    echo $PROMPT_R_TRIANGLE
  else
    set_color -b $next_bg_color
  end

  if [ $next_bg_color = "normal" ]
    set -e current_bg_color
  else
    set -g current_bg_color $next_bg_color
  end
end

# fishのプロンプトの装飾
function fish_prompt --description 'Write out the prompt'
  for fragment in $prompt_fragments
    set -e cmd_result
    set elements (string split / $fragment)

    set cmd $elements[1]
    set bg_color $elements[2]
    set fg_color $elements[3]

    set cmd_result ($cmd | string trim)
    string length $cmd_result > /dev/null
    if [ $status -eq 0 ]
      echo -n -s (prompt_border $bg_color) (set_color $fg_color) " $cmd_result "
    end

  end
  echo -n -s (prompt_border normal) " "
end

# fishのプロンプト（右側）の装飾
function fish_right_prompt --description 'Write out the right prompt'
  printf "%s" (exit_code_prompt)
end

# fishのプロンプトが表示される前に、直前に実行されたコマンドのexit codeを環境変数に保存する
function store_exit_code --on-event fish_prompt
  set -g RETVAL "$status"
end
