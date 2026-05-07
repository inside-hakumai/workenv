const PR_NUMBER_REGEX = /^[0-9]+$/;
const REPO_REGEX = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

export function validatePrNumber(n: number): number {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Invalid PR number: ${n}`);
  }
  return n;
}

export function validateRepo(repo: string): string {
  if (!REPO_REGEX.test(repo)) {
    throw new Error(`Invalid repository format: ${repo}. Expected "owner/repo".`);
  }
  return repo;
}

export function parseOwnerRepo(repo: string): { owner: string; repoName: string } {
  const validated = validateRepo(repo);
  const [owner, repoName] = validated.split("/");
  return { owner: owner!, repoName: repoName! };
}
