import { describe, expect, test, vi } from 'vitest';
import { runGwmCli } from '../../src/cli/gwm/main.js';
import { ConfigurationError } from '../../src/shared/errors.js';

const createInkInstance = () => {
  const waitUntilExit = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const unmount = vi.fn();
  return { waitUntilExit, unmount };
};

describe('runGwmCli', () => {
  test('単一ブランチ指定時はInkアプリを描画して終了待機する', async () => {
    // Given
    // CLIに1件のブランチ名が渡された状態
    const cliInput = ['feature/ui-flow'];
    const meowMock = vi.fn().mockReturnValue({
      input: cliInput,
      help: '$ gwm <branch>',
    });
    const parseBranchInputMock = vi.fn().mockReturnValue({ branch: cliInput[0] });
    const inkInstance = createInkInstance();
    const renderMock = vi.fn().mockReturnValue(inkInstance);
    const registerTerminationHandlersMock = vi.fn();
    const handleCliFailureMock = vi.fn();
    const stderrWriter = vi.fn();
    const setExitCode = vi.fn();
    const onSignalMock = vi.fn();
    const exitMock = vi.fn();

    // When
    // CLIを実行したとき
    await runGwmCli({
      argv: cliInput,
      meow: meowMock,
      render: renderMock,
      parseBranchInput: parseBranchInputMock,
      registerTerminationHandlers: registerTerminationHandlersMock,
      handleCliFailure: handleCliFailureMock,
      stderrWriter,
      setExitCode,
      onSignal: onSignalMock,
      exit: exitMock,
    });

    // Then
    // Inkアプリが描画され結果待ちになる
    expect(renderMock).toHaveBeenCalledTimes(1);
    const renderedElement = renderMock.mock.calls[0]![0];
    expect(renderedElement.props.branch).toBe('feature/ui-flow');
    expect(inkInstance.waitUntilExit).toHaveBeenCalledTimes(1);
    expect(registerTerminationHandlersMock).toHaveBeenCalledWith(onSignalMock, expect.any(Function));
    expect(handleCliFailureMock).not.toHaveBeenCalled();
  });

  test('ブランチ未指定の場合はUsageを表示し即座に失敗する', async () => {
    // Given
    // 引数が指定されていないCLI状態
    const meowMock = vi.fn().mockReturnValue({
      input: [],
      help: '$ gwm <branch>',
    });
    const renderMock = vi.fn();
    const registerTerminationHandlersMock = vi.fn();
    const handleCliFailureMock = vi.fn();
    const stderrWriter = vi.fn();
    const setExitCode = vi.fn();

    // When
    // CLIを実行したとき
    await runGwmCli({
      argv: [],
      meow: meowMock,
      render: renderMock,
      registerTerminationHandlers: registerTerminationHandlersMock,
      handleCliFailure: handleCliFailureMock,
      stderrWriter,
      setExitCode,
    });

    // Then
    // Usageが標準エラーへ出力され、構成エラーが報告される
    expect(stderrWriter).toHaveBeenCalledWith('$ gwm <branch>\n');
    expect(setExitCode).toHaveBeenCalledWith(2);
    expect(handleCliFailureMock).toHaveBeenCalledTimes(1);
    expect(handleCliFailureMock.mock.calls[0]![0]).toBeInstanceOf(ConfigurationError);
    expect(renderMock).not.toHaveBeenCalled();
  });
});
