import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import getPRDiff, { GetPRDiffArgs } from "./github/pr-diff-tool.js";
import RuntimeSettings from "./utils/runtime-settings.js";
import addPRComment, { AddPRCommentArgs } from "./github/pr-comment-tool.js";

class PRReviewServer {
  private server: Server;

  constructor() {
    RuntimeSettings.getInstance().setGithubToken(
      process.env.GITHUB_TOKEN || ""
    );
    RuntimeSettings.getInstance().setGithubApiUrl(
      process.env.GITHUB_API_URL && process.env.GITHUB_API_URL.length > 0 ? process.env.GITHUB_API_URL : "https://api.github.com"
    );
    RuntimeSettings.getInstance().setCommentPrefix(
      process.env.COMMENT_PREFIX || ""
    );

    if (!RuntimeSettings.getInstance().githubToken) {
      console.error(
        "Warning: GITHUB_TOKEN environment variable not set. The server will not function properly."
      );
    }

    this.server = new Server(
      {
        name: "pr-review-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_pr_diff",
            description: "Get the file diffs for a specific pull request",
            inputSchema: {
              type: "object",
              properties: {
                owner: {
                  type: "string",
                  description: "Repository owner (username or organization)",
                },
                repo: {
                  type: "string",
                  description: "Repository name",
                },
                pull_number: {
                  type: "number",
                  description: "Pull request number",
                },
              },
              required: ["owner", "repo", "pull_number"],
            },
          },
          {
            name: "add_pr_comment",
            description:
              "Add a review comment to a specific file and line in a pull request",
            inputSchema: {
              type: "object",
              properties: {
                owner: {
                  type: "string",
                  description: "Repository owner (username or organization)",
                },
                repo: {
                  type: "string",
                  description: "Repository name",
                },
                pull_number: {
                  type: "number",
                  description: "Pull request number",
                },
                body: {
                  type: "string",
                  description: "Comment body text",
                },
                path: {
                  type: "string",
                  description: "File path for the comment",
                },
                line: {
                  type: "number",
                  description:
                    "The line number in the diff where you want to add a review comment (depends on the side, new code is RIGHT and old code is LEFT)",
                },
                side: {
                  type: "string",
                  enum: ["LEFT", "RIGHT"],
                  description:
                    "Side of the diff (LEFT for old, RIGHT for new). Defaults to RIGHT",
                },
              },
              required: [
                "owner",
                "repo",
                "pull_number",
                "body",
                "path",
                "line",
              ],
            },
          },
        ] satisfies Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === "get_pr_diff") {
          return await getPRDiff(args as GetPRDiffArgs);
        } else if (name === "add_pr_comment") {
          return await addPRComment(args as AddPRCommentArgs);
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("PR Review MCP server running on stdio");
  }
}

const server = new PRReviewServer();
server.run().catch(console.error);
