/**
 * ポート競合時の代替ポート候補生成
 */

/**
 * ポートの最大値
 */
const maxPort = 65_535;

/**
 * 提案するポート候補の最大数
 */
const maxSuggestions = 3;

/**
 * 競合したポートに対して代替ポート候補を生成する
 *
 * @param conflictedPort - 競合したポート番号
 * @returns 代替ポート候補のリスト（最大3件）
 */
export function suggestAlternativePorts(conflictedPort: number): number[] {
  const suggestions: number[] = [];

  for (let index = 1; index <= maxSuggestions; index++) {
    const candidatePort = conflictedPort + index;

    if (candidatePort > maxPort) {
      break;
    }

    suggestions.push(candidatePort);
  }

  return suggestions;
}
