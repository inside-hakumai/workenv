import { describe, expect, test, vi } from 'vitest';
import { deriveSignalExitCode, handleCliFailure, registerTerminationHandlers } from '../../src/cli/gwm/runtime.js';
import { ConfigurationError, exitCodes } from '../../src/shared/errors.js';

const createReporter = () => {
  const logError = vi.fn<(message: string) => void>();
  const setExitCode = vi.fn<(code: number) => void>();
  return { logError, setExitCode };
};

describe('handleCliFailure', () => {
  test('CliErrorを受け取った場合、メッセージと指定された終了コードで処理する', () => {
    // Given
    // CLI構成エラーが発生した状態
    const reporter = createReporter();
    const error = new ConfigurationError('引数が不足しています');

    // When
    // handleCliFailureを実行したとき
    handleCliFailure(error, reporter);

    // Then
    // エラー内容と構成エラー用の終了コードが設定される
    expect(reporter.logError).toHaveBeenCalledWith('引数が不足しています');
    expect(reporter.setExitCode).toHaveBeenCalledWith(exitCodes.configurationError);
  });

  test('一般的なErrorはメッセージをそのまま表示し、generalErrorで終了する', () => {
    // Given
    const reporter = createReporter();
    const error = new Error('想定外の失敗です');
    // When
    handleCliFailure(error, reporter);
    // Then
    expect(reporter.logError).toHaveBeenCalledWith('想定外の失敗です');
    expect(reporter.setExitCode).toHaveBeenCalledWith(exitCodes.generalError);
  });

  test('未知の値は汎用メッセージで扱い、generalErrorで終了する', () => {
    // Given
    const reporter = createReporter();
    // When
    handleCliFailure('non-error value', reporter);
    // Then
    expect(reporter.logError).toHaveBeenCalledWith('予期せぬエラーが発生しました');
    expect(reporter.setExitCode).toHaveBeenCalledWith(exitCodes.generalError);
  });
});

describe('registerTerminationHandlers', () => {
  test('SIGINTとSIGTERMを監視し、発火時にハンドラーへシグナル名を渡す', () => {
    // Given
    const registrarMock = vi.fn<(signal: NodeJS.Signals, handler: () => void) => void>();
    const onTerminateMock = vi.fn<(signal: NodeJS.Signals) => void>();
    const registrar = (signal: NodeJS.Signals, handler: () => void) => {
      registrarMock(signal, handler);
    };

    const onTerminate = (signal: NodeJS.Signals) => {
      onTerminateMock(signal);
    };

    // When
    registerTerminationHandlers(registrar, onTerminate);
    // Then
    expect(registrarMock).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(registrarMock).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    // And when registered handlers fire, onTerminate receives the signal
    const calls = registrarMock.mock.calls as [[NodeJS.Signals, () => void], [NodeJS.Signals, () => void]];
    const [[intSignal, intHandler], [termSignal, termHandler]] = calls;
    intHandler();
    termHandler();
    expect(onTerminateMock).toHaveBeenCalledWith(intSignal);
    expect(onTerminateMock).toHaveBeenCalledWith(termSignal);
  });
});

describe('deriveSignalExitCode', () => {
  test('SIGINTを受け取った場合、130で終了する', () => {
    // Given
    // ユーザーがCtrl+CでSIGINTを送った状態
    const signal: NodeJS.Signals = 'SIGINT';

    // When
    // 終了コードを算出したとき
    const exitCode = deriveSignalExitCode(signal);

    // Then
    // POSIX規約に従い130が返る
    expect(exitCode).toBe(130);
  });

  test('SIGTERMを受け取った場合、143で終了する', () => {
    // Given
    // プロセスがSIGTERMを受け取った状態
    const signal: NodeJS.Signals = 'SIGTERM';

    // When
    // 終了コードを算出したとき
    const exitCode = deriveSignalExitCode(signal);

    // Then
    // POSIX規約に従い143が返る
    expect(exitCode).toBe(143);
  });
});
