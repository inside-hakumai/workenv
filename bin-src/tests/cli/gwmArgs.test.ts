import { describe, expect, test, vi } from 'vitest';
import { parseBranchInput } from '../../src/cli/gwm/args.js';
import { ConfigurationError, exitCodes } from '../../src/shared/errors.js';

type FakeCli = {
  readonly input: readonly string[];
  readonly showHelp: ReturnType<typeof vi.fn>;
};

const createCli = (input: readonly string[]): FakeCli => ({
  input,
  showHelp: vi.fn(),
});

describe('parseBranchInput', () => {
  test('単一のブランチ名が渡された場合、ブランチ名を返す', () => {
    // Given
    // 有効なブランチ名が1件だけ指定されたCLI状態
    const cli = createCli(['feature/login-page']);

    // When
    // 引数を解析したとき
    const result = parseBranchInput(cli);

    // Then
    // ブランチ名がそのまま返され、ヘルプは表示されない
    expect(result.branch).toBe('feature/login-page');
    expect(cli.showHelp).not.toHaveBeenCalled();
  });

  test('引数が1件未満の場合、ヘルプを表示して構成エラーを投げる', () => {
    // Given
    // 引数が何も指定されていないCLI状態
    const cli = createCli([]);

    // When / Then
    // 解析時にヘルプが表示され、構成エラーが発生する
    expect(() => parseBranchInput(cli)).toThrow(ConfigurationError);
    expect(cli.showHelp).toHaveBeenCalledWith(exitCodes.configurationError);
  });

  test('複数の引数が渡された場合もヘルプを表示して構成エラーを投げる', () => {
    // Given
    // 複数の引数が指定されたCLI状態
    const cli = createCli(['feature/login', 'extra']);

    // When / Then
    // 解析時にヘルプが表示され、構成エラーが発生する
    expect(() => parseBranchInput(cli)).toThrow(ConfigurationError);
    expect(cli.showHelp).toHaveBeenCalledWith(exitCodes.configurationError);
  });

  test('空文字のブランチ名は構成エラーとして拒否する', () => {
    // Given
    // 空文字のみのブランチ名が渡されたCLI状態
    const cli = createCli(['']);

    // When / Then
    // 解析時に構成エラーが発生し、ヘルプは表示されない
    expect(() => parseBranchInput(cli)).toThrow(ConfigurationError);
    expect(cli.showHelp).not.toHaveBeenCalled();
  });

  test('空白のみのブランチ名は構成エラーとして拒否する', () => {
    // Given
    // 空白文字のみのブランチ名が渡されたCLI状態
    const cli = createCli(['   ']);

    // When / Then
    // 解析時に構成エラーが発生し、ヘルプは表示されない
    expect(() => parseBranchInput(cli)).toThrow(ConfigurationError);
    expect(cli.showHelp).not.toHaveBeenCalled();
  });

  test('前後に空白が含まれる場合はトリムした値を返す', () => {
    // Given
    // 前後に空白を含むブランチ名が指定されたCLI状態
    const cli = createCli(['  feature/signup  ']);

    // When
    // 引数を解析したとき
    const result = parseBranchInput(cli);

    // Then
    // トリム後のブランチ名が返される
    expect(result.branch).toBe('feature/signup');
  });
});
