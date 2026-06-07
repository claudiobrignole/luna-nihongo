export interface Point2D {
  x: number;
  y: number;
}

export interface ReferenceStroke {
  index: number;
  number: number;
  start: Point2D;
  end: Point2D;
  mid: Point2D;
  samples: Point2D[];
}

export interface KanjiVgCharacter {
  kanjiVgId: string;
  viewBox: string;
  width: number;
  height: number;
  svgUrl: string;
  strokes: ReferenceStroke[];
}

export interface KanjiVgManifestEntry {
  kanjiVgId: string;
  strokeCount: number;
  svgStrokeCount: number;
  path: string;
}

export interface KanjiVgManifest {
  source: string;
  release: string;
  license: string;
  count: number;
  characters: KanjiVgManifestEntry[];
}

let manifestPromise: Promise<KanjiVgManifest> | null = null;

export function getKanjiVgManifest(): Promise<KanjiVgManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch('/kanjivg/manifest.json')
      .then((res) => {
        if (!res.ok) throw new Error('KanjiVG manifest not found');
        return res.json() as Promise<KanjiVgManifest>;
      });
  }
  return manifestPromise;
}

function strokeNumberFromId(id: string): number {
  const match = id.match(/-s(\d+)$/i);
  return match ? Number(match[1]) : 0;
}

function parseReferenceStrokes(svg: SVGSVGElement): ReferenceStroke[] {
  const viewBox = svg.getAttribute('viewBox') ?? '0 0 109 109';
  const parts = viewBox.split(/\s+/).map(Number);
  const width = parts[2] ?? 109;
  const height = parts[3] ?? 109;

  const measureRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  measureRoot.setAttribute('viewBox', viewBox);
  measureRoot.setAttribute('width', String(width));
  measureRoot.setAttribute('height', String(height));
  measureRoot.style.position = 'absolute';
  measureRoot.style.left = '-9999px';
  measureRoot.style.visibility = 'hidden';
  document.body.appendChild(measureRoot);

  const group = svg.querySelector('[id*="StrokePaths"]');
  const pathNodes = group
    ? [...group.querySelectorAll('path[id*="-s"]')]
    : [...svg.querySelectorAll('path[id*="-s"]')];

  const sorted = pathNodes
    .map((node) => {
      const clone = node.cloneNode(true) as SVGPathElement;
      measureRoot.appendChild(clone);
      return clone;
    })
    .sort((a, b) => strokeNumberFromId(a.id) - strokeNumberFromId(b.id));

  const strokes = sorted.map((pathEl, index) => {
    const total = pathEl.getTotalLength();
    const startPt = pathEl.getPointAtLength(0);
    const endPt = pathEl.getPointAtLength(total);
    const midPt = pathEl.getPointAtLength(total * 0.5);
    const samples: Point2D[] = [];
    for (let step = 0; step <= 10; step += 1) {
      const pt = pathEl.getPointAtLength((total * step) / 10);
      samples.push({ x: pt.x / width, y: pt.y / height });
    }
    return {
      index,
      number: strokeNumberFromId(pathEl.id) || index + 1,
      start: { x: startPt.x / width, y: startPt.y / height },
      end: { x: endPt.x / width, y: endPt.y / height },
      mid: { x: midPt.x / width, y: midPt.y / height },
      samples,
    };
  });

  document.body.removeChild(measureRoot);
  return strokes;
}

export async function loadKanjiVgCharacter(kanjiVgId: string): Promise<KanjiVgCharacter> {
  const id = kanjiVgId.toLowerCase();
  const svgUrl = `/kanjivg/kanji/${id}.svg`;
  const response = await fetch(svgUrl);
  if (!response.ok) {
    throw new Error(`KanjiVG SVG not found: ${id}`);
  }

  const svgText = await response.text();
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement as unknown as SVGSVGElement;
  const viewBox = svg.getAttribute('viewBox') ?? '0 0 109 109';
  const parts = viewBox.split(/\s+/).map(Number);

  return {
    kanjiVgId: id,
    viewBox,
    width: parts[2] ?? 109,
    height: parts[3] ?? 109,
    svgUrl,
    strokes: parseReferenceStrokes(svg),
  };
}

export function canUseStrokeCanvas(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    if (!canvas.getContext('2d')) return false;
    return 'PointerEvent' in window;
  } catch {
    return false;
  }
}
