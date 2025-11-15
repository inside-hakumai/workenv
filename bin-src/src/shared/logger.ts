/**
 * Ink互換のログフォーマッタ
 */

import { Text } from 'ink';
import React from 'react';

/**
 * ログレベル
 */
export type LogLevel = 'info' | 'success' | 'warning' | 'error';

const colorByLevel: Record<LogLevel, string> = {
  info: 'cyan',
  success: 'green',
  warning: 'yellow',
  error: 'red',
};

const prefixByLevel: Record<LogLevel, string> = {
  info: 'ℹ',
  success: '✔',
  warning: '⚠',
  error: '✖',
};

/**
 * ログメッセージの色を取得する
 *
 * @param level - ログレベル
 * @returns Inkのcolor属性に対応する色名
 */
function getColorForLevel(level: LogLevel): string {
  return colorByLevel[level];
}

/**
 * ログメッセージのプレフィックスを取得する
 *
 * @param level - ログレベル
 * @returns プレフィックス記号
 */
function getPrefixForLevel(level: LogLevel): string {
  return prefixByLevel[level];
}

/**
 * ステータスログメッセージをフォーマットする
 *
 * @param level - ログレベル
 * @param message - ログメッセージ
 * @returns Inkコンポーネント
 */
export function formatStatusLog(level: LogLevel, message: string) {
  const color = getColorForLevel(level);
  const prefix = getPrefixForLevel(level);

  return React.createElement(Text, { color }, `${prefix} ${message}`);
}

/**
 * エラーログメッセージをフォーマットする
 *
 * @param error - エラーオブジェクトまたはメッセージ
 * @returns Inkコンポーネント
 */
export function formatErrorLog(error: Error | string) {
  const message = error instanceof Error ? error.message : error;
  return formatStatusLog('error', message);
}

/**
 * 成功ログメッセージをフォーマットする
 *
 * @param message - ログメッセージ
 * @returns Inkコンポーネント
 */
export function formatSuccessLog(message: string) {
  return formatStatusLog('success', message);
}

/**
 * 情報ログメッセージをフォーマットする
 *
 * @param message - ログメッセージ
 * @returns Inkコンポーネント
 */
export function formatInfoLog(message: string) {
  return formatStatusLog('info', message);
}

/**
 * 警告ログメッセージをフォーマットする
 *
 * @param message - ログメッセージ
 * @returns Inkコンポーネント
 */
export function formatWarningLog(message: string) {
  return formatStatusLog('warning', message);
}
