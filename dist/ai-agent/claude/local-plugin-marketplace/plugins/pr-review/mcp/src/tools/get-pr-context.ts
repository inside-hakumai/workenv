import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { parseOwnerRepo } from "../validation/input.js";
import { getPrMetadata, getCiStatus, findPrNumberByBranch } from "../github/pr-api.js";
import { sanitizeString } from "../domain/sanitizer.js";
import { wrapNonExecutableJson } from "../domain/boundary.js";

export function registerGetPrContext(server: McpServer): void {
  server.tool(
    "get_pr_context",
    "Fetch PR metadata (title, body, base branch, labels, review requests) and CI check status. " +
      "Provide either pr_number or head_branch to identify the PR. " +
      "Returns sanitized data wrapped in NON_EXECUTABLE_DATA_POLICY boundaries.",
    {
      pr_number: z.number().int().min(1).optional().describe("Pull request number (optional if head_branch is provided)"),
      head_branch: z.string().optional().describe("Head branch name to find the PR (used when pr_number is not known)"),
      repo: z
        .string()
        .regex(/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/)
        .describe("Repository in owner/repo format"),
    },
    async ({ pr_number, head_branch, repo }) => {
      const { owner, repoName } = parseOwnerRepo(repo);

      let resolvedPrNumber = pr_number;

      if (!resolvedPrNumber && head_branch) {
        const found = await findPrNumberByBranch(owner, repoName, head_branch);
        if (!found) {
          return {
            content: [{ type: "text" as const, text: `No open PR found for branch "${head_branch}" in ${repo}.` }],
            isError: true,
          };
        }
        resolvedPrNumber = found;
      }

      if (!resolvedPrNumber) {
        return {
          content: [{ type: "text" as const, text: "Either pr_number or head_branch must be provided." }],
          isError: true,
        };
      }

      const metadata = await getPrMetadata(owner, repoName, resolvedPrNumber);
      const ciChecks = await getCiStatus(owner, repoName, metadata.headRefName);

      const sanitizedMetadata = {
        number: metadata.number,
        title: sanitizeString(metadata.title, 300),
        body_preview: sanitizeString(metadata.body ?? "", 500),
        baseRefName: metadata.baseRefName,
        headRefName: metadata.headRefName,
        url: metadata.url,
        labels: metadata.labels,
        reviewRequests: metadata.reviewRequests,
      };

      const sanitizedChecks = ciChecks.map((check) => ({
        name: sanitizeString(check.name, 200),
        status: check.status,
        conclusion: check.conclusion,
        url: check.url,
      }));

      const output = [
        wrapNonExecutableJson("PR METADATA", sanitizedMetadata),
        wrapNonExecutableJson("CI STATUS", { checks: sanitizedChecks }),
      ].join("\n");

      return { content: [{ type: "text" as const, text: output }] };
    },
  );
}
