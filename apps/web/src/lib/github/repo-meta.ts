export interface RepoMeta {
  fileCount: number;
  commitCount: number;
  sizeKb: number;
  defaultBranch: string;
  isPrivate: boolean;
}

export class GitHubError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

export async function fetchRepoMeta(owner: string, repo: string): Promise<RepoMeta> {
  const token = process.env["GITHUB_TOKEN"];
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ghostmap/1.0",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
    next: { revalidate: 60 },
  });

  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new GitHubError(
        "Repository not found. Check the URL and ensure the repo is public.",
        404,
      );
    }
    if (repoRes.status === 403) {
      throw new GitHubError(
        "GitHub API rate limit exceeded. Try again in a few minutes.",
        403,
      );
    }
    throw new GitHubError(`GitHub API error: ${repoRes.statusText}`, repoRes.status);
  }

  const repoData = (await repoRes.json()) as {
    size: number;
    default_branch: string;
    private: boolean;
  };
  const defaultBranch = repoData.default_branch;
  const sizeKb = repoData.size;
  const isPrivate = repoData.private;

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
    { headers, next: { revalidate: 60 } },
  );

  let fileCount = 0;
  if (treeRes.ok) {
    const treeData = (await treeRes.json()) as {
      tree: Array<{ type: string }>;
      truncated?: boolean;
    };
    fileCount = treeData.tree.filter((item) => item.type === "blob").length;
    if (treeData.truncated) {
      fileCount = 100_001;
    }
  } else {
    fileCount = Math.round(sizeKb / 20);
  }

  const commitsRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
    { headers, next: { revalidate: 60 } },
  );

  let commitCount = 0;
  if (commitsRes.ok) {
    const linkHeader = commitsRes.headers.get("link") ?? "";
    const match = linkHeader.match(/[?&]page=(\d+)>;\s*rel="last"/);
    const pageValue = match?.[1];
    commitCount = pageValue ? Number.parseInt(pageValue, 10) : 1;
  }

  return { fileCount, commitCount, sizeKb, defaultBranch, isPrivate };
}
