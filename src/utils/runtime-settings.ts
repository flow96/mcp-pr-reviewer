class RuntimeSettings {
  private static instance: RuntimeSettings;
  private _githubToken: string;
  private _githubApiUrl: string;
  private _commentPrefix: string;

  private constructor() {
    this._githubToken = process.env.GITHUB_TOKEN || "";
    this._githubApiUrl = process.env.GITHUB_API_URL || "https://api.github.com";
    this._commentPrefix = process.env.COMMENT_PREFIX || "";
  }

  public static getInstance(): RuntimeSettings {
    if (!RuntimeSettings.instance) {
      RuntimeSettings.instance = new RuntimeSettings();
    }
    return RuntimeSettings.instance;
  }

  public get githubToken(): string {
    return this._githubToken;
  }

  public get githubApiUrl(): string {
    return this._githubApiUrl;
  }

  public get commentPrefix(): string {
    return this._commentPrefix;
  }

  public setGithubToken(token: string): void {
    this._githubToken = token;
  }

  public setGithubApiUrl(url: string): void {
    this._githubApiUrl = url;
  }

  public setCommentPrefix(prefix: string): void {
    this._commentPrefix = prefix;
  }
}

export default RuntimeSettings;
