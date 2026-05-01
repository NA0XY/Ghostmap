import fs from "node:fs/promises";
import path from "node:path";
import { simpleGit } from "simple-git";
import { logger } from "../utils/logger.js";

const MAX_CLONE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

export class CloneSizeError extends Error {
  constructor(sizeBytes: number) {
    super(
      "Repository is too large to clone (> 500 MB). Use the npm package to run locally.",
    );
    this.name = "CloneSizeError";
    this.cause = { sizeBytes };
  }
}

/**
 * Clone a GitHub repository to a local directory.
 * Uses --depth 1 (shallow clone) for Feature 1.
 */
export async function cloneRepo(
  repoUrl: string,
  destDir: string,
  jobId: string,
): Promise<void> {
  const log = logger.child({ jobId, repoUrl });
  log.info("Cloning repo");

  const git = simpleGit();
  await git.clone(repoUrl, destDir, ["--depth", "1", "--single-branch", "--no-tags"]);

  log.info("Clone complete — checking size");

  const sizeBytes = await getDirSize(destDir);
  if (sizeBytes > MAX_CLONE_SIZE_BYTES) {
    throw new CloneSizeError(sizeBytes);
  }

  log.info("Clone size OK", { sizeBytes });
}

/**
 * Recursively compute the total size in bytes of a directory.
 */
async function getDirSize(dir: string): Promise<number> {
  let total = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await getDirSize(entryPath);
    } else if (entry.isFile()) {
      const stat = await fs.stat(entryPath);
      total += stat.size;
    }
  }

  return total;
}
