import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetPrContext } from "./get-pr-context.js";
import { registerGetPrReviewSummary } from "./get-pr-review-summary.js";
import { registerGetUnresolvedThreads } from "./get-unresolved-threads.js";

export function registerTools(server: McpServer): void {
  registerGetPrContext(server);
  registerGetPrReviewSummary(server);
  registerGetUnresolvedThreads(server);
}
