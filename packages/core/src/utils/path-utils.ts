import fs from "node:fs";
import path from "node:path";

function isInsideRoot(candidatePath: string, repoRoot: string): boolean {
  const normalizedRoot = path.resolve(repoRoot);
  const normalizedCandidate = path.resolve(candidatePath);
  const relative = path.relative(normalizedRoot, normalizedCandidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function resolveJsTsImport(
  specifier: string,
  importingFile: string,
  repoRoot: string,
): string | null {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const importingDir = path.dirname(importingFile);
  const baseCandidate = path.resolve(importingDir, specifier);
  const candidates = [
    baseCandidate,
    `${baseCandidate}.ts`,
    `${baseCandidate}.tsx`,
    `${baseCandidate}.js`,
    `${baseCandidate}.jsx`,
    `${baseCandidate}.mts`,
    `${baseCandidate}.cts`,
    `${baseCandidate}.mjs`,
    `${baseCandidate}.cjs`,
    path.join(baseCandidate, "index.ts"),
    path.join(baseCandidate, "index.tsx"),
    path.join(baseCandidate, "index.js"),
    path.join(baseCandidate, "index.jsx"),
    path.join(baseCandidate, "index.mts"),
    path.join(baseCandidate, "index.cts"),
    path.join(baseCandidate, "index.mjs"),
    path.join(baseCandidate, "index.cjs"),
  ];

  for (const candidate of candidates) {
    if (!isInsideRoot(candidate, repoRoot)) {
      continue;
    }
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.resolve(candidate);
    }
  }

  return null;
}

export function resolvePythonImport(
  moduleName: string,
  importingFile: string,
  repoRoot: string,
  isRelative: boolean,
): string | null {
  const normalizedModule = moduleName.replace(/^\.+/, "");
  const baseDir = isRelative ? path.dirname(importingFile) : repoRoot;
  const modulePath = normalizedModule.replace(/\./g, path.sep);
  const candidates = [
    path.join(baseDir, `${modulePath}.py`),
    path.join(baseDir, modulePath, "__init__.py"),
  ];

  for (const candidate of candidates) {
    if (!isInsideRoot(candidate, repoRoot)) {
      continue;
    }
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.resolve(candidate);
    }
  }

  return null;
}

export function toRelativePath(absolutePath: string, repoRoot: string): string {
  return path.relative(repoRoot, absolutePath).replace(/\\/g, "/");
}

export function makeNodeId(relativePath: string, functionName?: string): string {
  return functionName ? `${relativePath}::${functionName}` : relativePath;
}
