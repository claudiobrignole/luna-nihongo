import type { Point2D, ReferenceStroke } from '../services/kanjiVgLoader';

export const STROKE_START_TOLERANCE = 0.24;
export const STROKE_END_TOLERANCE = 0.24;
export const STROKE_MID_TOLERANCE = 0.28;
export const MIN_STROKE_POINTS = 4;
export const MIN_STROKE_LENGTH = 0.07;
export const MIN_DIRECTION_DOT = 0.15;

export interface StrokeCheckResult {
  ok: boolean;
  issue?: 'too_short' | 'start' | 'end' | 'direction' | 'shape';
}

export interface StrokeOrderGradeResult {
  passed: boolean;
  strokeResults: StrokeCheckResult[];
  wrongCount: boolean;
  tooMany: boolean;
  tooFew: boolean;
  orderIssue: boolean;
}

function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(v: Point2D): Point2D {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function strokeVector(points: Point2D[]): Point2D {
  if (points.length < 2) return { x: 0, y: 0 };
  return normalize({
    x: points[points.length - 1].x - points[0].x,
    y: points[points.length - 1].y - points[0].y,
  });
}

function strokeLength(points: Point2D[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += dist(points[i - 1], points[i]);
  }
  return total;
}

function normalizeUserStroke(points: Point2D[]): Point2D[] {
  return points.map((p) => ({ x: p.x, y: p.y }));
}

export function matchSingleStroke(
  rawPoints: Point2D[],
  reference: ReferenceStroke,
): StrokeCheckResult {
  const points = normalizeUserStroke(rawPoints);
  if (points.length < MIN_STROKE_POINTS) {
    return { ok: false, issue: 'too_short' };
  }
  if (strokeLength(points) < MIN_STROKE_LENGTH) {
    return { ok: false, issue: 'too_short' };
  }

  const userStart = points[0];
  const userEnd = points[points.length - 1];
  const userMid = points[Math.floor(points.length / 2)];

  if (dist(userStart, reference.start) > STROKE_START_TOLERANCE) {
    return { ok: false, issue: 'start' };
  }
  if (dist(userEnd, reference.end) > STROKE_END_TOLERANCE) {
    return { ok: false, issue: 'end' };
  }
  if (dist(userMid, reference.mid) > STROKE_MID_TOLERANCE) {
    return { ok: false, issue: 'shape' };
  }

  const userDir = strokeVector(points);
  const refDir = strokeVector([reference.start, reference.end]);
  const dot = userDir.x * refDir.x + userDir.y * refDir.y;
  if (dot < MIN_DIRECTION_DOT) {
    return { ok: false, issue: 'direction' };
  }

  return { ok: true };
}

export function evaluateStrokeOrder(
  userStrokes: Point2D[][],
  references: ReferenceStroke[],
  enforceOrder: boolean,
): StrokeOrderGradeResult {
  const expected = references.length;
  const strokeResults: StrokeCheckResult[] = [];

  if (userStrokes.length > expected) {
    return {
      passed: false,
      strokeResults: [],
      wrongCount: true,
      tooMany: true,
      tooFew: false,
      orderIssue: false,
    };
  }

  if (userStrokes.length < expected) {
    return {
      passed: false,
      strokeResults: [],
      wrongCount: true,
      tooMany: false,
      tooFew: true,
      orderIssue: false,
    };
  }

  if (enforceOrder) {
    let orderIssue = false;
    for (let i = 0; i < expected; i += 1) {
      const result = matchSingleStroke(userStrokes[i], references[i]);
      strokeResults.push(result);
      if (!result.ok) orderIssue = true;
    }
    return {
      passed: strokeResults.every((r) => r.ok),
      strokeResults,
      wrongCount: false,
      tooMany: false,
      tooFew: false,
      orderIssue,
    };
  }

  const unused = new Set(references.map((_, i) => i));
  for (const userStroke of userStrokes) {
    let bestIdx = -1;
    let bestOk = false;
    for (const idx of unused) {
      const result = matchSingleStroke(userStroke, references[idx]);
      if (result.ok) {
        bestIdx = idx;
        bestOk = true;
        break;
      }
      if (bestIdx < 0) bestIdx = idx;
    }
    if (bestOk && bestIdx >= 0) {
      strokeResults.push({ ok: true });
      unused.delete(bestIdx);
    } else if (bestIdx >= 0) {
      strokeResults.push(matchSingleStroke(userStroke, references[bestIdx]));
      unused.delete(bestIdx);
    }
  }

  return {
    passed: strokeResults.every((r) => r.ok),
    strokeResults,
    wrongCount: false,
    tooMany: false,
    tooFew: false,
    orderIssue: false,
  };
}
