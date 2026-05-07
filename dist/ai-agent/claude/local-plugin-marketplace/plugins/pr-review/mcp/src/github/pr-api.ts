import { getOctokit } from "./client.js";

const MAX_API_ITEMS = 500;

export interface PrMetadata {
  number: number;
  title: string;
  body: string | null;
  baseRefName: string;
  headRefName: string;
  url: string;
  labels: string[];
  reviewRequests: string[];
}

export interface CiCheck {
  name: string;
  status: string;
  conclusion: string | null;
  url: string | null;
}

export interface ReviewState {
  login: string;
  state: string;
  submittedAt: string;
}

export interface PrComment {
  login: string;
  createdAt: string;
  body: string;
}

export interface ReviewComment {
  login: string;
  path: string;
  line: number | null;
  body: string;
}

export async function findPrNumberByBranch(
  owner: string,
  repo: string,
  headBranch: string,
): Promise<number | null> {
  const octokit = getOctokit();
  const { data: prs } = await octokit.rest.pulls.list({
    owner,
    repo,
    head: `${owner}:${headBranch}`,
    state: "open",
    per_page: 1,
  });
  return prs[0]?.number ?? null;
}

export async function getPrMetadata(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PrMetadata> {
  const octokit = getOctokit();
  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  const { data: reviewRequests } = await octokit.rest.pulls.listRequestedReviewers({
    owner,
    repo,
    pull_number: prNumber,
  });

  return {
    number: pr.number,
    title: pr.title,
    body: pr.body,
    baseRefName: pr.base.ref,
    headRefName: pr.head.ref,
    url: pr.html_url,
    labels: pr.labels.map((l) => l.name),
    reviewRequests: [
      ...reviewRequests.users.map((u) => u.login),
      ...reviewRequests.teams.map((t) => t.slug),
    ],
  };
}

export async function getCiStatus(
  owner: string,
  repo: string,
  ref: string,
): Promise<CiCheck[]> {
  const octokit = getOctokit();
  const checks = await octokit.paginate(octokit.rest.checks.listForRef, {
    owner,
    repo,
    ref,
    per_page: 100,
  });

  return checks.slice(0, MAX_API_ITEMS).map((check) => ({
    name: check.name,
    status: check.status,
    conclusion: check.conclusion,
    url: check.html_url,
  }));
}

export async function getReviewStates(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<ReviewState[]> {
  const octokit = getOctokit();
  const reviews = await octokit.paginate(octokit.rest.pulls.listReviews, {
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  return reviews.slice(0, MAX_API_ITEMS).map((r) => ({
    login: r.user?.login ?? "unknown",
    state: r.state,
    submittedAt: r.submitted_at ?? "",
  }));
}

export async function getPrComments(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PrComment[]> {
  const octokit = getOctokit();
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });

  return comments.slice(0, MAX_API_ITEMS).map((c) => ({
    login: c.user?.login ?? "unknown",
    createdAt: c.created_at,
    body: c.body ?? "",
  }));
}

export async function getReviewComments(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<ReviewComment[]> {
  const octokit = getOctokit();
  const comments = await octokit.paginate(octokit.rest.pulls.listReviewComments, {
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  return comments.slice(0, MAX_API_ITEMS).map((c) => ({
    login: c.user?.login ?? "unknown",
    path: c.path,
    line: c.line ?? c.original_line ?? null,
    body: c.body,
  }));
}
