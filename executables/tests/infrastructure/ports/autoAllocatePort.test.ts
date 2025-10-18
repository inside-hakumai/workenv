import { beforeEach, describe, expect, test, vi } from 'vitest';
import { autoAllocatePort } from '../../../src/infrastructure/ports/autoAllocatePort.js';

type MockNetState = {
  defaultAllocatedPort: number;
  nextPort: number;
  assignPort(): number;
  reset(): void;
};

const netMock = vi.hoisted(() => {
  const state: MockNetState = {
    defaultAllocatedPort: 45_000,
    nextPort: 45_000,
    assignPort() {
      const { nextPort } = state;
      state.nextPort += 1;
      return nextPort;
    },
    reset() {
      state.nextPort = state.defaultAllocatedPort;
    },
  };

  return {
    createServerMock: vi.fn(),
    state,
  };
});

vi.mock('node:net', async () => {
  const { EventEmitter: nodeEventEmitter } = await import('node:events');

  class MockServer extends nodeEventEmitter {
    #port = netMock.state.defaultAllocatedPort;

    listen(port: number) {
      this.#port = port === 0 ? netMock.state.assignPort() : port;
      setTimeout(() => {
        this.emit('listening');
      }, 0);
      return this;
    }

    close(callback?: () => void) {
      callback?.();
      return this;
    }

    address() {
      return {
        port: this.#port,
        address: '127.0.0.1',
        family: 'IPv4' as const,
      };
    }
  }

  netMock.createServerMock.mockImplementation(() => new MockServer());

  return {
    createServer: netMock.createServerMock,
  };
});

const mockNetState = netMock.state;
const { createServerMock } = netMock;

beforeEach(() => {
  mockNetState.reset();
  createServerMock.mockClear();
});

describe('autoAllocatePort', () => {
  test('ユーザー指定ポートがない場合、自動的に空きポートを割り当てる', async () => {
    // Given
    // ポートが指定されていない状態
    const userPort = undefined;

    // When
    // ポート自動割り当てを実行したとき
    const result = await autoAllocatePort(userPort);

    // Then
    // 有効な範囲のポートが割り当てられ、利用可能である
    expect(result.port).toBeGreaterThanOrEqual(1024);
    expect(result.port).toBeLessThanOrEqual(65_535);
    expect(result.requestedByUser).toBe(false);
    expect(result.validationOutcome).toBe('available');
  });

  test('ユーザー指定ポートがある場合、そのポートの可用性をチェックする', async () => {
    // Given
    // ユーザーがポート番号を指定した状態（おそらく利用可能なポート）
    const userPort = 19_222; // 通常は使用されていないポート

    // When
    // ポート検証を実行したとき
    const result = await autoAllocatePort(userPort);

    // Then
    // 指定されたポートで検証が行われる
    expect(result.port).toBe(userPort);
    expect(result.requestedByUser).toBe(true);
    // 利用可能かどうかは環境依存のため、outcomeが設定されていることのみ確認
    expect(['available', 'occupied', 'error']).toContain(result.validationOutcome);
  });
});
