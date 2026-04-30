import fs from "node:fs";
import path from "node:path";
import ignoreFactory, { type Ignore as IgnoreMatcher } from "ignore";
import { isSupportedFile } from "./language-detector.js";
import { logger } from "../utils/logger.js";

const ALWAYS_IGNORE = [
  "node_modules",
  ".git",
  ".ghostmap",
  "dist",
  "build",
  ".next",
  "out",
  "coverage",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  "*.min.js",
  "*.bundle.js",
  "*.d.ts",
  "vendor",
  ".venv",
  "venv",
  "env",
];

const createIgnore = ignoreFactory as unknown as () => IgnoreMatcher;

function normalizePath(inputPath: string): string {
  return inputPath.replace(/\\/g, "/");
}

function isPathInside(root: string, candidate: string): boolean {
  const rel = path.relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function loadGitignore(dir: string, ig: IgnoreMatcher): void {
  const gitignorePath = path.join(dir, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    return;
  }
  try {
    const content = fs.readFileSync(gitignorePath, "utf8");
    ig.add(content);
  } catch (error) {
    logger.warn("Unable to read .gitignore", {
      dir,
      error: String(error),
    });
  }
}

export async function walkFiles(
  repoRoot: string,
  maxFiles = 50_000,
): Promise<string[]> {
  if (!fs.existsSync(repoRoot)) {
    throw new Error(`Repository root does not exist: ${repoRoot}`);
  }
  if (!fs.statSync(repoRoot).isDirectory()) {
    throw new Error(`Repository root is not a directory: ${repoRoot}`);
  }

  const normalizedRoot = path.resolve(repoRoot);
  const rootIgnore = createIgnore().add(ALWAYS_IGNORE);
  loadGitignore(normalizedRoot, rootIgnore);

  const results: string[] = [];
  const seenRealDirectories = new Set<string>();
  let totalScanned = 0;

  function walkDirectory(dirPath: string, parentIgnore: IgnoreMatcher): void {
    if (results.length >= maxFiles) {
      return;
    }

    let realDirPath: string;
    try {
      realDirPath = fs.realpathSync(dirPath);
    } catch (error) {
      logger.warn("Unable to resolve real path for directory", {
        dirPath,
        error: String(error),
      });
      return;
    }

    if (seenRealDirectories.has(realDirPath)) {
      return;
    }
    seenRealDirectories.add(realDirPath);

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (error) {
      logger.warn("Cannot read directory", { dirPath, error: String(error) });
      return;
    }

    const localIgnore = createIgnore().add(ALWAYS_IGNORE);
    loadGitignore(dirPath, localIgnore);

    for (const entry of entries) {
      if (results.length >= maxFiles) {
        logger.warn("File limit reached. Skipping remaining files.", {
          maxFiles,
        });
        return;
      }

      const entryPath = path.join(dirPath, entry.name);
      const relativeFromRoot = normalizePath(path.relative(normalizedRoot, entryPath));

      if (
        parentIgnore.ignores(relativeFromRoot) ||
        localIgnore.ignores(entry.name)
      ) {
        continue;
      }

      totalScanned += 1;

      let stat: fs.Stats;
      try {
        stat = fs.statSync(entryPath);
      } catch (error) {
        logger.warn("Cannot stat path", {
          entryPath,
          error: String(error),
        });
        continue;
      }

      if (stat.isDirectory()) {
        walkDirectory(entryPath, parentIgnore);
        continue;
      }

      if (stat.isFile()) {
        if (!isSupportedFile(entry.name)) {
          continue;
        }
        if (!isPathInside(normalizedRoot, path.resolve(entryPath))) {
          continue;
        }
        results.push(path.resolve(entryPath));
      }
    }
  }

  walkDirectory(normalizedRoot, rootIgnore);

  logger.info("File walk complete", {
    repoRoot: normalizedRoot,
    scanned: totalScanned,
    supported: results.length,
  });

  return results;
}
