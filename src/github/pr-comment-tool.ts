import { z } from "zod";
import { Octokit } from "@octokit/rest";
import RuntimeSettings from "../utils/runtime-settings.js";

const AddPRCommentSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  pull_number: z.number().describe("Pull request number"),
  body: z.string().describe("Comment body text"),
  path: z.string().describe("File path for the comment"),
  line: z
    .number()
    .describe(
      "The line number in the diff where you want to add a review comment"
    ),
  side: z
    .enum(["LEFT", "RIGHT"])
    .optional()
    .describe(
      "Side of the diff (LEFT for old, RIGHT for new). Defaults to RIGHT"
    ),
});

export type AddPRCommentArgs = z.infer<typeof AddPRCommentSchema>;

export default async function addPRComment(args: AddPRCommentArgs) {
  const {
    owner,
    repo,
    pull_number,
    body,
    path,
    line,
    side = "RIGHT",
  } = AddPRCommentSchema.parse(args);

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
    // Get the latest commit SHA from the PR
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number,
    });

    const commit_id = pr.head.sha;

    // Create a review comment using position-based approach
    const { data: comment } = await octokit.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number,
      body: RuntimeSettings.getInstance().commentPrefix + body,
      commit_id,
      path,
      line,
      side,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully added comment to PR #${pull_number} in ${owner}/${repo}\n\nComment details:\n- File: ${path}\n- Line: ${line}\n- Side: ${side}\n- Comment ID: ${comment.id}\n- URL: ${comment.html_url}`,
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to add PR comment: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
