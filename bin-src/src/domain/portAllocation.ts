/**
 * ポート割り当てに関するドメイン型とバリデーション規約
 */

import { portRange } from '../shared/constants.js';
import { ConfigurationError } from '../shared/errors.js';

/**
 * ポート検証結果の種類
 */
export type PortValidationOutcome = 'available' | 'occupied' | 'error';

/**
 * ポート検証結果
 */
export type PortValidationResult = {
  /** 検証対象ポート */
  port: number;
  /** ユーザーが明示的に指定したか */
  requestedByUser: boolean;
  /** 検証結果 */
  validationOutcome: PortValidationOutcome;
  /** エラーメッセージ（error時のみ） */
  errorMessage?: string;
};

/**
 * ポート候補の提案
 */
export type PortSuggestion = {
  /** 競合したポート */
  conflictedPort: number;
  /** 推奨する代替ポート（最大3件） */
  suggestedAlternatives: number[];
};

/**
 * ポート番号が有効範囲内かを検証する
 *
 * @param port - 検証対象のポート番号
 * @returns バリデーション結果
 * @throws {ConfigurationError} ポート番号が範囲外の場合
 */
export function validatePortRange(port: number): void {
  if (!Number.isInteger(port)) {
    throw new ConfigurationError(`ポート番号は整数である必要があります: ${port}`);
  }

  if (port < portRange.min || port > portRange.max) {
    throw new ConfigurationError(`ポート番号は${portRange.min}から${portRange.max}の範囲である必要があります: ${port}`);
  }
}
