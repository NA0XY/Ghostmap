import { describe, expect, it } from "vitest";
import { buildGraph } from "../src/graph/builder.js";
import type { ParsedFile } from "../src/types/index.js";

const REPO_ROOT = "/fake/repo";

function makeFile(
  relativePath: string,
  language: "javascript" | "typescript" | "python" = "javascript",
): ParsedFile {
  return {
    path: `${REPO_ROOT}/${relativePath}`,
    relativePath,
    language,
    functions: [],
    imports: [],
    lineCount: 10,
    sizeBytes: 500,
    parseError: null,
  };
}

describe("buildGraph", () => {
  it("creates one file node per parsed file", () => {
    const files = [makeFile("a.js"), makeFile("b.js")];
    const graph = buildGraph(files, REPO_ROOT, 100, new Map());
    const fileNodes = graph.nodes.filter((node) => node.type === "file");
    expect(fileNodes.length).toBe(2);
  });

  it("creates import edges between files", () => {
    const a = makeFile("a.js");
    const b = makeFile("b.js");
    const aWithImport: ParsedFile = {
      ...a,
      imports: [
        {
          sourceFile: a.path,
          importedNames: ["foo"],
          rawSpecifier: "./b",
          resolvedPath: b.path,
          isExternal: false,
          line: 1,
        },
      ],
    };

    const graph = buildGraph([aWithImport, b], REPO_ROOT, 100, new Map());
    const importEdges = graph.edges.filter((edge) => edge.type === "import");
    expect(importEdges.length).toBe(1);
    expect(importEdges[0]?.source).toBe("a.js");
    expect(importEdges[0]?.target).toBe("b.js");
  });

  it("deduplicates edges", () => {
    const a = makeFile("a.js");
    const b = makeFile("b.js");
    const aWithDupeImports: ParsedFile = {
      ...a,
      imports: [
        {
          sourceFile: a.path,
          importedNames: ["foo"],
          rawSpecifier: "./b",
          resolvedPath: b.path,
          isExternal: false,
          line: 1,
        },
        {
          sourceFile: a.path,
          importedNames: ["bar"],
          rawSpecifier: "./b",
          resolvedPath: b.path,
          isExternal: false,
          line: 2,
        },
      ],
    };

    const graph = buildGraph([aWithDupeImports, b], REPO_ROOT, 100, new Map());
    const importEdges = graph.edges.filter((edge) => edge.type === "import");
    expect(importEdges.length).toBe(1);
  });

  it("records parse failures in stats", () => {
    const good = makeFile("good.js");
    const bad: ParsedFile = {
      ...makeFile("bad.js"),
      parseError: "syntax error",
    };
    const graph = buildGraph([good, bad], REPO_ROOT, 100, new Map());
    expect(graph.stats.failedFiles).toBe(1);
    expect(graph.stats.parsedFiles).toBe(1);
  });
});
