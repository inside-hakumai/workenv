/**
 * ポート可用性チェック機能
 */

import { createServer } from 'node:net';
import { type PortValidationResult, validatePortRange } from '../../domain/portAllocation.js';

/**
 * 指定されたポートが利用可能かを検証する
 *
 * net.createServerを用いてポートをバインドし、
 * 成功すれば利用可能、失敗すれば占有されていると判定する
 *
 * @param port - 検証対象のポート番号
 * @param requestedByUser - ユーザーが明示的に指定したか
 * @returns ポート検証結果
 */
export async function checkPortAvailability(port: number, requestedByUser: boolean): Promise<PortValidationResult> {
  // ポート番号の範囲チェック
  try {
    validatePortRange(port);
  } catch (error) {
    return {
      port,
      requestedByUser,
      validationOutcome: 'error',
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  return new Promise(resolve => {
    const server = createServer();

    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolve({
          port,
          requestedByUser,
          validationOutcome: 'occupied',
        });
      } else {
        resolve({
          port,
          requestedByUser,
          validationOutcome: 'error',
          errorMessage: error.message,
        });
      }
    });

    server.once('listening', () => {
      server.close(() => {
        resolve({
          port,
          requestedByUser,
          validationOutcome: 'available',
        });
      });
    });

    server.listen(port, '127.0.0.1');
  });
}
