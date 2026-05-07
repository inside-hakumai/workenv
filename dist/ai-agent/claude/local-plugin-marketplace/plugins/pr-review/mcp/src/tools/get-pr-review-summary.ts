import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { parseOwnerRepo } from "../validation/input.js";
import {
  getReviewStates,
  getPrComments,
  getReviewComments,
} from "../github/pr-api.js";
import { filterBots } from "../domain/bot-filter.js";
import { sanitizeString, sanitizeBody, sanitizePath } from "../domain/sanitizer.js";
import { wrapNonExecutableJson } from "../domain/boundary.js";

function buildReviewStateTable(
  reviews: Array<{ login: string; state: string; submittedAt: string }>,
  excludeBots: boolean,
): string {
  const filtered = excludeBots
    ? filterBots(reviews, (r) => r.login)
    : reviews;

  const sorted = [...filtered].sort(
    (a, b) => a.submittedAt.localeCompare(b.submittedAt),
  );

  const header = "| Reviewer | State | Date |\n|----------|-------|------|";
  const rows = sorted.map((r) => {
    const date = r.submittedAt.split("T")[0] ?? "";
    return `| ${r.login} | ${r.state} | ${date} |`;
  });

  return ["===== REVIEW STATE SUMMARY =====", header, ...rows, ""].join("\n");
}

function buildPrCommentsPayload(
  comments: Array<{ login: string; createdAt: string; body: string }>,
  excludeBots: boolean,
): unknown {
  const filtered = excludeBots
    ? filterBots(comments, (c) => c.login)
    : comments;

  return {
    count: filtered.length,
    items: filtered.map((c) => ({
      kind: "issue_comment",
      author: c.login,
      created_at: c.createdAt.split("T")[0] ?? "",
      body_preview: sanitizeString(c.body, 200),
    })),
  };
}

interface GroupedReviewComments {
  count: number;
  groups: Array<{
    path: string;
    comments: Array<{
      line: number | null;
      author: string;
      body_preview: string;
    }>;
  }>;
}

function buildReviewCommentsPayload(
  comments: Array<{ login: string; path: string; line: number | null; body: string }>,
  excludeBots: boolean,
): GroupedReviewComments {
  const filtered = excludeBots
    ? filterBots(comments, (c) => c.login)
    : comments;

  const grouped = new Map<string, typeof filtered>();
  for (const c of filtered) {
    const key = c.path;
    const group = grouped.get(key) ?? [];
    group.push(c);
    grouped.set(key, group);
  }

  return {
    count: filtered.length,
    groups: Array.from(grouped.entries()).map(([path, items]) => ({
      path: sanitizePath(path),
      comments: items.map((c) => ({
        line: c.line,
        author: c.login,
        body_preview: sanitizeBody(c.body),
      })),
    })),
  };
}

export function registerGetPrReviewSummary(server: McpServer): void {
  server.tool(
    "get_pr_review_summary",
    "Fetch all review states, PR-level comments, and inline review comments for a pull request. " +
      "Filters bot comments by default, sanitizes text, and wraps output in NON_EXECUTABLE_DATA_POLICY boundaries.",
    {
      pr_number: z.number().int().min(1).describe("Pull request number"),
      repo: z
        .string()
        .regex(/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/)
        .describe("Repository in owner/repo format"),
      include_bots: z
        .boolean()
        .default(false)
        .describe("Include bot comments (coderabbitai, dependabot, etc.)"),
    },
    async ({ pr_number, repo, include_bots }) => {
      const { owner, repoName } = parseOwnerRepo(repo);
      const excludeBots = !include_bots;

      const [reviewStates, prComments, reviewComments] = await Promise.all([
        getReviewStates(owner, repoName, pr_number),
        getPrComments(owner, repoName, pr_number),
        getReviewComments(owner, repoName, pr_number),
      ]);

      const reviewStateTable = buildReviewStateTable(reviewStates, excludeBots);
      const prCommentsPayload = buildPrCommentsPayload(prComments, excludeBots);
      const reviewCommentsPayload = buildReviewCommentsPayload(reviewComments, excludeBots);

      const output = [
        reviewStateTable,
        wrapNonExecutableJson("PR COMMENTS (non-review)", prCommentsPayload),
        wrapNonExecutableJson("REVIEW COMMENTS (inline)", reviewCommentsPayload),
      ].join("\n");

      return { content: [{ type: "text" as const, text: output }] };
    },
  );
}
