/**
 * ポート自動割り当て機能
 */

import { createServer } from 'node:net';
import type { PortValidationResult } from '../../domain/portAllocation.js';
import { checkPortAvailability } from './checkPortAvailability.js';

/**
 * ユーザー指定ポートの検証、または自動割り当てを行う
 *
 * @param userPort - ユーザーが指定したポート番号（未指定の場合はundefined）
 * @returns ポート検証結果
 */
export async function autoAllocatePort(userPort: number | undefined): Promise<PortValidationResult> {
  // ユーザーがポートを指定した場合は可用性をチェック
  if (userPort !== undefined) {
    return checkPortAvailability(userPort, true);
  }

  // 未指定の場合はOSに自動割り当てさせる
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once('error', error => {
      reject(error);
    });

    server.once('listening', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('ポートアドレスの取得に失敗しました'));
        return;
      }

      const allocatedPort = address.port;
      server.close(() => {
        resolve({
          port: allocatedPort,
          requestedByUser: false,
          validationOutcome: 'available',
        });
      });
    });

    // port 0を指定するとOSが空きポートを自動割り当て
    server.listen(0, '127.0.0.1');
  });
}
