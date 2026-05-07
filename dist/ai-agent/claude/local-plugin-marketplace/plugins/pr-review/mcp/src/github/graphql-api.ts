import { getGraphqlClient } from "./client.js";

export interface RawThread {
  isResolved: boolean;
  isOutdated: boolean;
  path: string | null;
  line: number | null;
  comments: Array<{
    authorLogin: string;
    body: string;
    createdAt: string;
    url: string;
  }>;
}

interface ThreadsQueryResponse {
  repository: {
    pullRequest: {
      reviewThreads: {
        nodes: Array<{
          isResolved: boolean;
          isOutdated: boolean;
          comments: {
            nodes: Array<{
              author: { login: string } | null;
              body: string;
              path: string | null;
              line: number | null;
              createdAt: string;
              url: string;
            }>;
          };
        }>;
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    };
  };
}

const REVIEW_THREADS_QUERY = `
query($owner: String!, $repo: String!, $pr: Int!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100, after: $cursor) {
        nodes {
          isResolved
          isOutdated
          comments(first: 10) {
            nodes {
              author { login }
              body
              path
              line
              createdAt
              url
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
`;

export async function getUnresolvedThreads(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<RawThread[]> {
  const graphql = getGraphqlClient();
  const allThreads: RawThread[] = [];
  let cursor: string | null = null;

  do {
    const response: ThreadsQueryResponse = await graphql(REVIEW_THREADS_QUERY, {
      owner,
      repo,
      pr: prNumber,
      cursor,
    }) as ThreadsQueryResponse;

    const reviewThreads = response.repository.pullRequest.reviewThreads;
    const { nodes } = reviewThreads;
    const pageInfoData = reviewThreads.pageInfo;

    for (const node of nodes) {
      if (node.isResolved) continue;

      const firstComment = node.comments.nodes[0];
      if (!firstComment) continue;

      allThreads.push({
        isResolved: false,
        isOutdated: node.isOutdated,
        path: firstComment.path,
        line: firstComment.line,
        comments: node.comments.nodes.map((c: (typeof node.comments.nodes)[number]) => ({
          authorLogin: c.author?.login ?? "unknown",
          body: c.body,
          createdAt: c.createdAt,
          url: c.url,
        })),
      });
    }

    cursor = pageInfoData.hasNextPage ? pageInfoData.endCursor : null;
  } while (cursor);

  return allThreads;
}
