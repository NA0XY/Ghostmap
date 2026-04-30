export type Language = "javascript" | "typescript" | "python";

export interface Import {
  readonly sourceFile: string;
  readonly importedNames: string[];
  readonly rawSpecifier: string;
  readonly resolvedPath: string | null;
  readonly isExternal: boolean;
  readonly line: number;
}

export interface FunctionCall {
  readonly calleeName: string;
  readonly line: number;
}

export interface ParsedFunction {
  readonly name: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly calls: FunctionCall[];
  readonly hasDocstring: boolean;
  readonly isExported: boolean;
  readonly isAsync: boolean;
}

export interface ParsedFile {
  readonly path: string;
  readonly relativePath: string;
  readonly language: Language;
  readonly functions: ParsedFunction[];
  readonly imports: Import[];
  readonly lineCount: number;
  readonly sizeBytes: number;
  readonly parseError: string | null;
}

export type GraphNodeType = "file" | "function";

export interface GraphNodeMetadata {
  readonly lineCount?: number;
  readonly sizeBytes?: number;
  readonly language?: Language;
  readonly isExported?: boolean;
  readonly isAsync?: boolean;
  readonly hasDocstring?: boolean;
  readonly lastModifiedMs?: number;
  readonly decayScore?: number;
  readonly strangerDanger?: boolean;
  readonly ownerEmail?: string;
}

export interface GraphNode {
  readonly id: string;
  readonly label: string;
  readonly type: GraphNodeType;
  readonly filePath: string;
  readonly relativePath: string;
  readonly language: Language | null;
  readonly metadata: GraphNodeMetadata;
}

export type GraphEdgeType = "import" | "call" | "contains";

export interface GraphEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly type: GraphEdgeType;
}

export interface GraphStats {
  readonly totalFiles: number;
  readonly totalFunctions: number;
  readonly totalEdges: number;
  readonly parsedFiles: number;
  readonly failedFiles: number;
  readonly languageBreakdown: Record<Language, number>;
  readonly analysisTimeMs: number;
}

export interface GraphData {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
  readonly generatedAt: string;
  readonly repoPath: string;
  readonly stats: GraphStats;
}

export interface CommitRecord {
  readonly hash: string;
  readonly shortHash: string;
  readonly author: string;
  readonly authorEmail: string;
  readonly date: string;
  readonly message: string;
  readonly filesChanged: string[];
}

export interface BlameEntry {
  readonly filePath: string;
  readonly authorEmail: string;
  readonly authorName: string;
  readonly lineCount: number;
  readonly lastCommitHash: string;
  readonly lastCommitDate: string;
}

export interface AuthorStats {
  readonly email: string;
  readonly name: string;
  readonly color: string;
  readonly totalCommits: number;
  readonly ownedFiles: string[];
}
