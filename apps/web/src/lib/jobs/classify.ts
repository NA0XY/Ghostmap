import type { RepoMeta } from "../github/repo-meta";
import type { JobClassification } from "../supabase/database.types";

export interface ClassificationResult {
  classification: JobClassification;
  reason: string | null;
}

const FILE_THRESHOLD_INSTANT = 500;
const FILE_THRESHOLD_MODERATE = 2_000;
const FILE_THRESHOLD_MAX = 50_000;
const COMMIT_THRESHOLD_HEAVY = 5_000;

export function classifyJob(meta: RepoMeta, features: string[]): ClassificationResult {
  if (features.includes("timeline")) {
    return {
      classification: "heavy",
      reason: "Timeline Slider requires full git history analysis.",
    };
  }

  if (meta.fileCount > FILE_THRESHOLD_MAX) {
    return {
      classification: "heavy",
      reason: `This repo has over ${FILE_THRESHOLD_MAX.toLocaleString()} files. We'll email you when it's ready.`,
    };
  }

  if (
    meta.fileCount > FILE_THRESHOLD_MODERATE ||
    meta.commitCount > COMMIT_THRESHOLD_HEAVY
  ) {
    const reason =
      meta.commitCount > COMMIT_THRESHOLD_HEAVY
        ? `${meta.commitCount.toLocaleString()} commits — full git history takes a while. We'll email you when it's ready.`
        : `${meta.fileCount.toLocaleString()} files — large repos take a while. We'll email you when it's ready.`;
    return { classification: "heavy", reason };
  }

  if (meta.fileCount > FILE_THRESHOLD_INSTANT) {
    return { classification: "moderate", reason: null };
  }

  return { classification: "instant", reason: null };
}

export function getMaxFileCount(): number {
  return FILE_THRESHOLD_MAX;
}
