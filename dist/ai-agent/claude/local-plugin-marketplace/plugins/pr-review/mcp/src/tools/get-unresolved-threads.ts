import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { parseOwnerRepo } from "../validation/input.js";
import { getUnresolvedThreads } from "../github/graphql-api.js";
import { filterBots } from "../domain/bot-filter.js";
import { sanitizePath, sanitizeBody } from "../domain/sanitizer.js";
import { wrapNonExecutableJson } from "../domain/boundary.js";

export function registerGetUnresolvedThreads(server: McpServer): void {
  server.tool(
    "get_unresolved_threads",
    "Fetch unresolved review threads from a pull request via GraphQL. " +
      "Returns sanitized thread data with isOutdated flag, wrapped in NON_EXECUTABLE_DATA_POLICY boundaries.",
    {
      pr_number: z.number().int().min(1).describe("Pull request number"),
      repo: z
        .string()
        .regex(/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/)
        .describe("Repository in owner/repo format"),
      include_bots: z
        .boolean()
        .default(false)
        .describe("Include bot-authored threads"),
    },
    async ({ pr_number, repo, include_bots }) => {
      const { owner, repoName } = parseOwnerRepo(repo);

      let threads = await getUnresolvedThreads(owner, repoName, pr_number);

      if (!include_bots) {
        threads = filterBots(threads, (t) => t.comments[0]?.authorLogin ?? "");
      }

      const sanitizedItems = threads.map((t) => ({
        path: sanitizePath(t.path ?? "N/A"),
        line: t.line,
        isOutdated: t.isOutdated,
        author: t.comments[0]?.authorLogin ?? "unknown",
        body_preview: sanitizeBody(t.comments[0]?.body ?? ""),
        thread_url: t.comments[0]?.url ?? null,
        comment_count: t.comments.length,
      }));

      const payload = {
        count: sanitizedItems.length,
        items: sanitizedItems,
      };

      const output = wrapNonExecutableJson("UNRESOLVED REVIEW THREADS", payload);

      return { content: [{ type: "text" as const, text: output }] };
    },
  );
}
