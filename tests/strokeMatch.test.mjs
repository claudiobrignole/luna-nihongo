import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const STROKE_START_TOLERANCE = 0.24;
const STROKE_END_TOLERANCE = 0.24;
const MIN_STROKE_POINTS = 4;
const MIN_STROKE_LENGTH = 0.07;
const MIN_DIRECTION_DOT = 0.15;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function strokeVector(points) {
  if (points.length < 2) return { x: 0, y: 0 };
  const dx = points[points.length - 1].x - points[0].x;
  const dy = points[points.length - 1].y - points[0].y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function strokeLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += dist(points[i - 1], points[i]);
  return total;
}

function matchSingleStroke(points, reference) {
  if (points.length < MIN_STROKE_POINTS || strokeLength(points) < MIN_STROKE_LENGTH) {
    return { ok: false, issue: 'too_short' };
  }
  const userStart = points[0];
  const userEnd = points[points.length - 1];
  if (dist(userStart, reference.start) > STROKE_START_TOLERANCE) return { ok: false, issue: 'start' };
  if (dist(userEnd, reference.end) > STROKE_END_TOLERANCE) return { ok: false, issue: 'end' };
  const userDir = strokeVector(points);
  const refDir = strokeVector([reference.start, reference.end]);
  if (userDir.x * refDir.x + userDir.y * refDir.y < MIN_DIRECTION_DOT) return { ok: false, issue: 'direction' };
  return { ok: true };
}

function evaluateStrokeOrder(userStrokes, references, enforceOrder) {
  const expected = references.length;
  if (userStrokes.length > expected) return { passed: false, tooMany: true, tooFew: false };
  if (userStrokes.length < expected) return { passed: false, tooMany: false, tooFew: true };
  const strokeResults = [];
  if (enforceOrder) {
    let orderIssue = false;
    for (let i = 0; i < expected; i += 1) {
      const result = matchSingleStroke(userStrokes[i], references[i]);
      strokeResults.push(result);
      if (!result.ok) orderIssue = true;
    }
    return { passed: strokeResults.every((r) => r.ok), strokeResults, orderIssue, tooMany: false, tooFew: false };
  }
  return { passed: true, strokeResults, orderIssue: false, tooMany: false, tooFew: false };
}

function refStroke(index, start, end) {
  return {
    index,
    number: index + 1,
    start,
    end,
    mid: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
  };
}

test('kanjivg bundle ships svg files and manifest', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'public/kanjivg/manifest.json'), 'utf8'));
  const svgFiles = readdirSync(join(ROOT, 'public/kanjivg/kanji')).filter((f) => f.endsWith('.svg'));
  assert.equal(manifest.count, manifest.characters.length);
  assert.equal(svgFiles.length, manifest.count);
  assert.ok(manifest.count >= 92, 'expected at least kana bundle (92)');
  assert.ok(existsSync(join(ROOT, 'public/kanjivg/COPYING')));
  assert.ok(existsSync(join(ROOT, 'public/kanjivg/kanji/03042.svg')));
  assert.ok(existsSync(join(ROOT, 'public/kanjivg/kanji/0601d.svg')), 'N4 kanji 思 SVG');
});

test('evaluateStrokeOrder rejects too few strokes', () => {
  const refs = [
    refStroke(0, { x: 0.2, y: 0.3 }, { x: 0.8, y: 0.3 }),
    refStroke(1, { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.9 }),
  ];
  const result = evaluateStrokeOrder(
    [[{ x: 0.2, y: 0.3 }, { x: 0.45, y: 0.3 }, { x: 0.78, y: 0.32 }]],
    refs,
    true,
  );
  assert.equal(result.passed, false);
  assert.equal(result.tooFew, true);
});

test('evaluateStrokeOrder rejects too many strokes', () => {
  const refs = [refStroke(0, { x: 0.2, y: 0.3 }, { x: 0.8, y: 0.3 })];
  const result = evaluateStrokeOrder(
    [
      [{ x: 0.2, y: 0.3 }, { x: 0.45, y: 0.3 }, { x: 0.78, y: 0.32 }],
      [{ x: 0.5, y: 0.2 }, { x: 0.51, y: 0.5 }, { x: 0.52, y: 0.85 }],
    ],
    refs,
    true,
  );
  assert.equal(result.passed, false);
  assert.equal(result.tooMany, true);
});

test('evaluateStrokeOrder flags wrong order when enforceOrder is true', () => {
  const refs = [
    refStroke(0, { x: 0.2, y: 0.3 }, { x: 0.8, y: 0.3 }),
    refStroke(1, { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.9 }),
  ];
  const result = evaluateStrokeOrder(
    [
      [
        { x: 0.48, y: 0.22 },
        { x: 0.49, y: 0.55 },
        { x: 0.51, y: 0.88 },
      ],
      [
        { x: 0.22, y: 0.31 },
        { x: 0.5, y: 0.3 },
        { x: 0.79, y: 0.29 },
      ],
    ],
    refs,
    true,
  );
  assert.equal(result.passed, false);
  assert.equal(result.orderIssue, true);
});
