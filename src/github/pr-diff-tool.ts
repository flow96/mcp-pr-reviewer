import { z } from "zod";
import { Octokit } from "@octokit/rest";
import RuntimeSettings from "../utils/runtime-settings.js";

const GetPRDiffSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  pull_number: z.number().describe("Pull request number"),
});
export type GetPRDiffArgs = z.infer<typeof GetPRDiffSchema>;

export default async function getPRDiff(
  args: GetPRDiffArgs
) {
  const { owner, repo, pull_number } = GetPRDiffSchema.parse(args);

  if (!RuntimeSettings.getInstance().githubToken) {
    throw new Error(
      "GitHub token not configured. Please set the GITHUB_TOKEN environment variable."
    );
  }

  const octokit = new Octokit({
    auth: RuntimeSettings.getInstance().githubToken,
    baseUrl: RuntimeSettings.getInstance().githubApiUrl,
  });

  try {
    // Get PR files
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number,
    });

    // Get PR details for context
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number,
    });

    const diffSummary = {
      pr_info: {
        title: pr.title,
        number: pr.number,
        state: pr.state,
        base_branch: pr.base.ref,
        head_branch: pr.head.ref,
        author: pr.user?.login,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
      },
      files: files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch || "Binary file or no changes",
      })),
      total_stats: {
        total_files: files.length,
        total_additions: files.reduce((sum, file) => sum + file.additions, 0),
        total_deletions: files.reduce((sum, file) => sum + file.deletions, 0),
      },
    };

    return {
      content: [
        {
          type: "text",
          text: `Successfully retrieved diff for PR #${pull_number} in ${owner}/${repo}\n\n${JSON.stringify(
            diffSummary,
            null,
            2
          )}`,
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to get PR diff: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
