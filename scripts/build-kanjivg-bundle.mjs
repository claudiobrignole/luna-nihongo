#!/usr/bin/env node
/**
 * Extract KanjiVG SVG files for kana strokeData ids (reproducible bundle).
 *
 * Usage:
 *   node scripts/build-kanjivg-bundle.mjs --source /path/to/kanjivg/kanji
 *   node scripts/build-kanjivg-bundle.mjs --zip /path/to/kanjivg-YYYYMMDD-main.zip
 *
 * Output: public/kanjivg/kanji/*.svg + manifest.json (SVGs unmodified)
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KANA_JSON = join(ROOT, 'content/curriculum/repositories/kana.json');
const OUT_DIR = join(ROOT, 'public/kanjivg');
const OUT_KANJI = join(OUT_DIR, 'kanji');
const MANIFEST_PATH = join(OUT_DIR, 'manifest.json');
const KANJIVG_RELEASE = 'r20250816';

function readIds() {
  const { kana } = JSON.parse(readFileSync(KANA_JSON, 'utf8'));
  const bySvgId = new Map();
  for (const item of kana) {
    if (!item.strokeData) continue;
    const kanjiVgId = String(item.strokeData.kanjiVgId).toLowerCase();
    bySvgId.set(kanjiVgId, {
      kanjiVgId,
      strokeCount: item.strokeData.strokeCount,
      kanaIds: [...(bySvgId.get(kanjiVgId)?.kanaIds ?? []), item.id],
      japanese: [...new Set([...(bySvgId.get(kanjiVgId)?.japanese ?? []), item.japanese])],
    });
  }
  return [...bySvgId.values()].sort((a, b) => a.kanjiVgId.localeCompare(b.kanjiVgId));
}

function countSvgStrokes(svgText) {
  const matches = svgText.match(/id="kvg:[0-9a-f]+-s\d+"/gi) ?? [];
  const nums = matches.map((m) => Number(m.match(/-s(\d+)"/i)?.[1] ?? 0));
  return nums.length ? Math.max(...nums) : 0;
}

function resolveSourceDir(argv) {
  const zipArg = argv.find((a) => a.startsWith('--zip='))?.slice(6)
    ?? (argv.includes('--zip') ? argv[argv.indexOf('--zip') + 1] : null);
  const sourceArg = argv.find((a) => a.startsWith('--source='))?.slice(9)
    ?? (argv.includes('--source') ? argv[argv.indexOf('--source') + 1] : null);

  if (sourceArg) {
    const kanjiDir = join(sourceArg, 'kanji');
    return existsSync(kanjiDir) ? kanjiDir : sourceArg;
  }

  if (zipArg) {
    const extractDir = join(tmpdir(), `kanjivg-extract-${Date.now()}`);
    mkdirSync(extractDir, { recursive: true });
    execSync(`unzip -q "${zipArg}" -d "${extractDir}"`, { stdio: 'inherit' });
    const kanjiDir = join(extractDir, 'kanji');
    if (!existsSync(kanjiDir)) {
      throw new Error(`No kanji/ folder in zip: ${zipArg}`);
    }
    return kanjiDir;
  }

  throw new Error('Provide --source <kanjivg/kanji dir> or --zip <kanjivg-main.zip>');
}

function main() {
  const entries = readIds();
  const sourceDir = resolveSourceDir(process.argv.slice(2));

  rmSync(OUT_KANJI, { recursive: true, force: true });
  mkdirSync(OUT_KANJI, { recursive: true });

  const manifest = {
    source: 'KanjiVG',
    release: KANJIVG_RELEASE,
    license: 'CC-BY-SA-3.0',
    generatedAt: new Date().toISOString(),
    count: entries.length,
    characters: [],
  };

  let missing = 0;
  let mismatch = 0;

  for (const entry of entries) {
    const src = join(sourceDir, `${entry.kanjiVgId}.svg`);
    const dest = join(OUT_KANJI, `${entry.kanjiVgId}.svg`);
    if (!existsSync(src)) {
      console.error(`MISSING ${entry.kanjiVgId}.svg (${entry.japanese.join(', ')})`);
      missing += 1;
      continue;
    }
    cpSync(src, dest);
    const svgText = readFileSync(dest, 'utf8');
    const pathCount = countSvgStrokes(svgText);
    if (pathCount !== entry.strokeCount) {
      console.warn(
        `WARN ${entry.kanjiVgId}: curriculum strokeCount=${entry.strokeCount}, svg paths=${pathCount}`,
      );
      mismatch += 1;
    }
    manifest.characters.push({
      kanjiVgId: entry.kanjiVgId,
      strokeCount: entry.strokeCount,
      svgStrokeCount: pathCount,
      kanaIds: entry.kanaIds,
      japanese: entry.japanese,
      path: `/kanjivg/kanji/${entry.kanjiVgId}.svg`,
    });
  }

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`KanjiVG bundle → ${OUT_KANJI}`);
  console.log(`  copied: ${manifest.characters.length}/${entries.length}`);
  if (missing) {
    process.exitCode = 1;
    console.error(`  missing: ${missing}`);
  }
  if (mismatch) {
    console.warn(`  strokeCount mismatches (informational): ${mismatch}`);
  }
}

main();
