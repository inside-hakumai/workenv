import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";

let octokitInstance: Octokit | null = null;
let graphqlInstance: typeof graphql | null = null;

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN environment variable is not set. " +
        "Set it before starting the MCP server, e.g.: export GITHUB_TOKEN=$(gh auth token)",
    );
  }
  return token;
}

export function getOctokit(): Octokit {
  if (!octokitInstance) {
    octokitInstance = new Octokit({ auth: getToken() });
  }
  return octokitInstance;
}

export function getGraphqlClient(): typeof graphql {
  if (!graphqlInstance) {
    graphqlInstance = graphql.defaults({
      headers: { authorization: `token ${getToken()}` },
    });
  }
  return graphqlInstance;
}
