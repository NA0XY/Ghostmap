export interface Point {
  x: number;
  y: number;
}

interface MembraneOptions {
  paddingScale?: number;
}

const SINGLE_NODE_RADIUS = 48;
const TWO_NODE_PADDING = 40;
const HULL_PADDING = 44;
const SMOOTHING_TENSION = 0.22;

export function hexAlpha(hex: string, alpha: number): string {
  const rgb = parseHexColor(hex);
  if (!rgb) {
    return `rgba(255,255,255,${clamp(alpha, 0, 1)})`;
  }
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${clamp(alpha, 0, 1)})`;
}

export function buildClusterMembranePath(points: Point[], options?: MembraneOptions): string | null {
  const paddingScale = clamp(options?.paddingScale ?? 1, 0.1, 1.5);
  const singleRadius = SINGLE_NODE_RADIUS * paddingScale;
  const twoNodePadding = TWO_NODE_PADDING * paddingScale;
  const hullPadding = HULL_PADDING * paddingScale;

  const validPoints = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (validPoints.length === 0) {
    return null;
  }
  if (validPoints.length === 1) {
    const single = validPoints[0];
    return single ? circlePath(single, singleRadius) : null;
  }
  if (validPoints.length === 2) {
    const first = validPoints[0];
    const second = validPoints[1];
    return first && second ? stadiumPath(first, second, twoNodePadding) : null;
  }

  const hull = convexHull(validPoints);
  if (hull.length === 0) {
    return null;
  }
  if (hull.length === 1) {
    const single = hull[0];
    return single ? circlePath(single, singleRadius) : null;
  }
  if (hull.length === 2) {
    const first = hull[0];
    const second = hull[1];
    return first && second ? stadiumPath(first, second, twoNodePadding) : null;
  }

  const expanded = expandHull(hull, hullPadding);
  const softened = chaikinSmooth(expanded, 2);
  return smoothClosedBezierPath(softened, SMOOTHING_TENSION);
}

function circlePath(center: Point, radius: number): string {
  const startX = center.x + radius;
  return [
    `M ${startX} ${center.y}`,
    `A ${radius} ${radius} 0 1 0 ${center.x - radius} ${center.y}`,
    `A ${radius} ${radius} 0 1 0 ${startX} ${center.y}`,
    "Z",
  ].join(" ");
}

function stadiumPath(a: Point, b: Point, radius: number): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);

  if (length < 1e-6) {
    return circlePath(a, SINGLE_NODE_RADIUS);
  }

  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;

  const p1 = { x: a.x + px * radius, y: a.y + py * radius };
  const p2 = { x: b.x + px * radius, y: b.y + py * radius };
  const p3 = { x: b.x - px * radius, y: b.y - py * radius };
  const p4 = { x: a.x - px * radius, y: a.y - py * radius };

  return [
    `M ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${radius} ${radius} 0 0 1 ${p3.x} ${p3.y}`,
    `L ${p4.x} ${p4.y}`,
    `A ${radius} ${radius} 0 0 1 ${p1.x} ${p1.y}`,
    "Z",
  ].join(" ");
}

function convexHull(points: Point[]): Point[] {
  const unique = dedupePoints(points);
  if (unique.length <= 2) {
    return unique;
  }

  const sorted = [...unique].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const lower: Point[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }

  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const point = sorted[i];
    if (!point) {
      continue;
    }
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function dedupePoints(points: Point[]): Point[] {
  const seen = new Set<string>();
  const out: Point[] = [];
  for (const point of points) {
    const key = `${point.x.toFixed(2)}:${point.y.toFixed(2)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(point);
  }
  return out;
}

function cross(a: Point | undefined, b: Point | undefined, c: Point): number {
  if (!a || !b) {
    return 0;
  }
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function expandHull(hull: Point[], padding: number): Point[] {
  const centroid = hull.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 },
  );
  centroid.x /= hull.length;
  centroid.y /= hull.length;

  return hull.map((point) => {
    const dx = point.x - centroid.x;
    const dy = point.y - centroid.y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-6) {
      return point;
    }
    const scale = (length + padding) / length;
    return {
      x: centroid.x + dx * scale,
      y: centroid.y + dy * scale,
    };
  });
}

function smoothClosedBezierPath(vertices: Point[], tension: number): string {
  const n = vertices.length;
  if (n < 3) {
    return polygonPath(vertices);
  }

  const parts: string[] = [`M ${vertices[0]?.x ?? 0} ${vertices[0]?.y ?? 0}`];
  for (let i = 0; i < n; i += 1) {
    const current = vertices[i];
    const prev = vertices[(i - 1 + n) % n];
    const next = vertices[(i + 1) % n];
    const next2 = vertices[(i + 2) % n];

    if (!current || !prev || !next || !next2) {
      continue;
    }

    const cp1 = {
      x: current.x + tension * (next.x - prev.x),
      y: current.y + tension * (next.y - prev.y),
    };
    const cp2 = {
      x: next.x - tension * (next2.x - current.x),
      y: next.y - tension * (next2.y - current.y),
    };

    parts.push(`C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${next.x} ${next.y}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

function chaikinSmooth(points: Point[], iterations: number): Point[] {
  if (points.length < 3 || iterations <= 0) {
    return points;
  }

  let current = [...points];
  for (let iter = 0; iter < iterations; iter += 1) {
    const next: Point[] = [];
    const n = current.length;
    for (let i = 0; i < n; i += 1) {
      const a = current[i];
      const b = current[(i + 1) % n];
      if (!a || !b) {
        continue;
      }
      next.push({
        x: a.x * 0.75 + b.x * 0.25,
        y: a.y * 0.75 + b.y * 0.25,
      });
      next.push({
        x: a.x * 0.25 + b.x * 0.75,
        y: a.y * 0.25 + b.y * 0.75,
      });
    }
    current = next;
  }
  return current;
}

function polygonPath(points: Point[]): string {
  if (points.length === 0) {
    return "";
  }
  const start = points[0];
  const parts = [`M ${start?.x ?? 0} ${start?.y ?? 0}`];
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    if (!point) {
      continue;
    }
    parts.push(`L ${point.x} ${point.y}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
