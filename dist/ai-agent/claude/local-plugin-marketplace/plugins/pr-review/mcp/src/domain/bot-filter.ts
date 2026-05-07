const BOT_PREFIXES = [
  "coderabbitai",
  "github-actions",
  "dependabot",
  "renovate",
  "codecov",
] as const;

export function isBot(login: string): boolean {
  const base = login.split("[")[0];
  return BOT_PREFIXES.some((prefix) => base === prefix);
}

export function filterBots<T>(items: T[], getLogin: (item: T) => string): T[] {
  return items.filter((item) => !isBot(getLogin(item)));
}
