import { spawn } from 'node:child_process';
import { GitCommandError, GitNotFoundError } from '../../shared/errors.js';

const gitBinary = 'git';

/**
 * Gitコマンド実行時の追加オプション
 */
export type GitCommandOptions = {
  /** 実行カレントディレクトリ（`git -C`相当） */
  readonly cwd?: string;
};

/**
 * Gitコマンド実行結果
 */
export type GitCommandResult = {
  /** 標準出力に書き込まれた文字列 */
  readonly stdout: string;
  /** 標準エラーに書き込まれた文字列 */
  readonly stderr: string;
};

/**
 * Gitコマンドを実行し、stdout/stderrを収集して返す。
 *
 * @param args - gitに渡す引数
 * @param options - cwdなどの実行オプション
 * @returns Gitコマンドが成功した場合のstdout/stderr
 * @throws GitNotFoundError gitバイナリが見つからない場合
 * @throws GitCommandError gitの終了コードが非ゼロ、もしくはspawnエラーが発生した場合
 */
export async function runGitCommand(
  args: readonly string[],
  options: GitCommandOptions = {},
): Promise<GitCommandResult> {
  return new Promise((resolve, reject) => {
    const spawnArgs = [...args];
    const childProcess = spawn(gitBinary, spawnArgs, {
      cwd: options.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let settled = false;
    let stdoutBuffer = '';
    let stderrBuffer = '';
    const stdoutDecoder = new TextDecoder();
    const stderrDecoder = new TextDecoder();

    const cleanup = () => {
      childProcess.stdout?.removeListener('data', handleStdoutData);
      childProcess.stderr?.removeListener('data', handleStderrData);
      childProcess.removeListener('close', handleClose);
      childProcess.removeListener('error', handleError);
      stdoutDecoder.decode();
      stderrDecoder.decode();
    };

    const resolveSuccess = () => {
      settled = true;
      resolve({
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
      });
    };

    const rejectWithError = (error: Error) => {
      settled = true;
      reject(error);
    };

    const handleStdoutData = (chunk: Uint8Array) => {
      stdoutBuffer += stdoutDecoder.decode(chunk, { stream: true });
    };

    const handleStderrData = (chunk: Uint8Array) => {
      stderrBuffer += stderrDecoder.decode(chunk, { stream: true });
    };

    const handleClose = (code: number | undefined, signal: NodeJS.Signals | undefined) => {
      cleanup();
      if (settled) {
        return;
      }

      if (code === 0 && signal === null) {
        resolveSuccess();
        return;
      }

      rejectWithError(
        new GitCommandError(
          `gitコマンドが失敗しました: ${gitBinary} ${spawnArgs.join(' ')}`,
          spawnArgs,
          stderrBuffer,
          code ?? undefined,
          signal ?? undefined,
        ),
      );
    };

    const handleError = (error: NodeJS.ErrnoException) => {
      cleanup();
      if (settled) {
        return;
      }

      if (error.code === 'ENOENT') {
        rejectWithError(new GitNotFoundError('gitコマンドが見つかりません。Gitをインストールしてください。'));
        return;
      }

      rejectWithError(
        new GitCommandError(`gitコマンドの起動に失敗しました: ${error.message}`, spawnArgs, stderrBuffer, undefined),
      );
    };

    childProcess.stdout?.on('data', handleStdoutData);
    childProcess.stderr?.on('data', handleStderrData);
    childProcess.once('close', handleClose);
    childProcess.once('error', handleError);
  });
}
