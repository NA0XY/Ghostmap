export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  cloneUrl: string;
}

export function parseGitHubUrl(input: string): ParsedGitHubUrl | null {
  const trimmed = input.trim().replace(/\/$/, "");
  const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  if (url.hostname !== "github.com") {
    return null;
  }

  const parts = url.pathname.replace(/\.git$/, "").split("/").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const owner = parts[0];
  const repo = parts[1];
  if (!owner || !repo) {
    return null;
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo)) {
    return null;
  }

  return {
    owner,
    repo,
    cloneUrl: `https://github.com/${owner}/${repo}.git`,
  };
}
