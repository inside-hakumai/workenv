/**
 * React DevToolsコアAPIのスタブ実装。
 *
 * InkがDEV環境で必要とする関数だが、本番バンドルでは未使用のため、
 * 依存解決を保ったまま空実装を提供する。
 */
export const initialize = (): void => {
  return undefined;
};

/**
 * React DevToolsとの接続処理のスタブ。
 *
 * 本番バンドルではデバッグ接続を行わない。
 */
export const connectToDevTools = (): void => {
  return undefined;
};

const reactDevtoolsStub = {
  initialize,
  connectToDevTools,
};

export default reactDevtoolsStub;
