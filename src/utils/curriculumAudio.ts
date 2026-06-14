/** Pre-generated curriculum audio manifest (public/audio/curriculum/manifest.json). */

export interface CurriculumAudioEntry {
  text: string;
  textHash: string;
  file: string;
  durationMs?: number;
}

export interface CurriculumAudioManifest {
  version: number;
  ttsProfile: {
    voice: string;
    models: string[];
    promptVersion: number;
  };
  curriculumSchemaVersion: string;
  generatedAt: string;
  stats?: {
    expectedUniqueFiles: number;
    presentUniqueFiles: number;
    expectedEntries: number;
    presentEntries: number;
    complete: boolean;
  };
  entries: Record<string, CurriculumAudioEntry>;
  byTextHash: Record<string, string>;
}

export function grammarExampleId(grammarId: string, index: number): string {
  return `${grammarId}:ex${index}`;
}

const MANIFEST_URL = '/audio/curriculum/manifest.json';

let manifestPromise: Promise<CurriculumAudioManifest | null> | null = null;
let cachedManifest: CurriculumAudioManifest | null = null;

export function normalizeJapaneseText(text: string): string {
  return text.normalize('NFC').trim();
}

/** SHA-256 hex prefix — must match scripts/curriculum-audio-lib.mjs */
export async function hashJapaneseText(text: string): Promise<string> {
  const normalized = normalizeJapaneseText(text);
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export async function loadCurriculumAudioManifest(): Promise<CurriculumAudioManifest | null> {
  if (cachedManifest) return cachedManifest;
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL)
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as CurriculumAudioManifest;
      })
      .catch(() => null);
  }
  cachedManifest = await manifestPromise;
  return cachedManifest;
}

export function resolveCurriculumAudioUrl(
  manifest: CurriculumAudioManifest,
  stableId: string,
  text: string,
): string | null {
  const byId = manifest.entries[stableId];
  if (byId?.file) return `/audio/curriculum/${byId.file}`;

  const normalized = normalizeJapaneseText(text);
  for (const entry of Object.values(manifest.entries)) {
    if (entry.text === normalized && entry.file) {
      return `/audio/curriculum/${entry.file}`;
    }
  }

  return null;
}

export async function resolveCurriculumAudioUrlAsync(
  manifest: CurriculumAudioManifest,
  stableId: string,
  text: string,
): Promise<string | null> {
  const direct = resolveCurriculumAudioUrl(manifest, stableId, text);
  if (direct) return direct;

  const hash = await hashJapaneseText(text);
  const file = manifest.byTextHash[hash];
  return file ? `/audio/curriculum/${file}` : null;
}

/** Prefetch manifest (e.g. when opening Studio tab). */
export function prefetchCurriculumAudioManifest(): void {
  void loadCurriculumAudioManifest();
}
