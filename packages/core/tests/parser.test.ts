import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { analyzeRepo } from "../src/index.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const JS_FIXTURE = path.join(currentDir, "fixtures", "simple-js");
const PY_FIXTURE = path.join(currentDir, "fixtures", "simple-py");

describe("analyzeRepo — JS fixture", () => {
  it("returns a valid GraphData object", async () => {
    const graph = await analyzeRepo(JS_FIXTURE);
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.stats.failedFiles).toBe(0);
    expect(graph.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("creates file nodes for both source files", async () => {
    const graph = await analyzeRepo(JS_FIXTURE);
    const fileNodes = graph.nodes.filter((node) => node.type === "file");
    const relativePaths = fileNodes.map((node) => node.relativePath);
    expect(relativePaths).toContain("src/index.js");
    expect(relativePaths).toContain("src/utils.js");
  });

  it("creates function nodes for exported functions", async () => {
    const graph = await analyzeRepo(JS_FIXTURE);
    const functionNodes = graph.nodes.filter((node) => node.type === "function");
    const names = functionNodes.map((node) => node.label);
    expect(names).toContain("main");
    expect(names).toContain("greet");
    expect(names).toContain("shout");
  });

  it("creates an import edge from index to utils", async () => {
    const graph = await analyzeRepo(JS_FIXTURE);
    const importEdges = graph.edges.filter((edge) => edge.type === "import");
    const pairs = importEdges.map((edge) => `${edge.source}->${edge.target}`);
    expect(
      pairs.some((pair) => pair.includes("src/index.js") && pair.includes("src/utils.js")),
    ).toBe(true);
  });

  it("does not include node_modules", async () => {
    const graph = await analyzeRepo(JS_FIXTURE);
    const paths = graph.nodes.map((node) => node.relativePath);
    expect(paths.every((filePath) => !filePath.includes("node_modules"))).toBe(true);
  });

  it("stats reflect correct counts", async () => {
    const graph = await analyzeRepo(JS_FIXTURE);
    expect(graph.stats.totalFiles).toBe(2);
    expect(graph.stats.languageBreakdown.javascript).toBe(2);
    expect(graph.stats.languageBreakdown.python).toBe(0);
  });
});

describe("analyzeRepo — Python fixture", () => {
  it("parses Python files correctly", async () => {
    const graph = await analyzeRepo(PY_FIXTURE);
    expect(graph.stats.failedFiles).toBe(0);
    const fileNodes = graph.nodes.filter((node) => node.type === "file");
    expect(fileNodes.length).toBe(2);
  });

  it("extracts Python functions including private ones", async () => {
    const graph = await analyzeRepo(PY_FIXTURE);
    const names = graph.nodes
      .filter((node) => node.type === "function")
      .map((node) => node.label);
    expect(names).toContain("greet");
    expect(names).toContain("main");
    expect(names).toContain("_internal_helper");
  });

  it("detects docstrings on Python functions", async () => {
    const graph = await analyzeRepo(PY_FIXTURE);
    const greetNode = graph.nodes.find((node) => node.label === "greet");
    expect(greetNode?.metadata.hasDocstring).toBe(true);
  });
});

describe("analyzeRepo — error handling", () => {
  it("throws on non-existent path", async () => {
    const missingPath = path.join(currentDir, "fixtures", "does-not-exist");
    await expect(analyzeRepo(missingPath)).rejects.toThrow();
  });

  it("throws on a file path instead of directory", async () => {
    await expect(analyzeRepo(currentFile)).rejects.toThrow(/not a directory/);
  });
});
