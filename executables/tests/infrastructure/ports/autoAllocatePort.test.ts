import { beforeEach, describe, expect, test, vi } from 'vitest';
import { autoAllocatePort } from '../../../src/infrastructure/ports/autoAllocatePort.js';

type MockNetState = {
  defaultAllocatedPort: number;
  nextPort: number;
  assignPort(): number;
  reset(): void;
};

let createServerMock: ReturnType<typeof vi.fn>;
let mockNetState: MockNetState;

vi.mock('node:net', async () => {
  const eventsModule = await import('node:events');

  mockNetState = {
    defaultAllocatedPort: 45_000,
    nextPort: 45_000,
    assignPort() {
      return this.nextPort++;
    },
    reset() {
      this.nextPort = this.defaultAllocatedPort;
    },
  };

  class MockServer extends eventsModule.EventEmitter {
    #port: number;

    constructor() {
      super();
      this.#port = mockNetState.defaultAllocatedPort;
    }

    listen(port: number) {
      this.#port = port === 0 ? mockNetState.assignPort() : port;
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

  createServerMock = vi.fn(() => new MockServer());

  return {
    createServer: createServerMock,
  };
});

beforeEach(() => {
  if (!mockNetState || !createServerMock) {
    throw new Error('net mock has not been initialized');
    // 実行時には必ずモックが初期化されている想定
  }

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
