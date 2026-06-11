#!/usr/bin/env node
/**
 * Extract KanjiVG SVG files for kana + kanji strokeData ids (reproducible bundle).
 *
 * Usage:
 *   node scripts/build-kanjivg-bundle.mjs --fetch
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
const KANJI_JSON = join(ROOT, 'content/curriculum/repositories/kanji.json');
const OUT_DIR = join(ROOT, 'public/kanjivg');
const OUT_KANJI = join(OUT_DIR, 'kanji');
const MANIFEST_PATH = join(OUT_DIR, 'manifest.json');
const KANJIVG_RELEASE = 'r20250816';
const KANJIVG_RAW_BASE = `https://raw.githubusercontent.com/KanjiVG/kanjivg/${KANJIVG_RELEASE}/kanji`;

function readIds() {
  const { kana } = JSON.parse(readFileSync(KANA_JSON, 'utf8'));
  const { kanji } = JSON.parse(readFileSync(KANJI_JSON, 'utf8'));
  const bySvgId = new Map();

  const upsert = (kanjiVgId, strokeCount, patch) => {
    const id = String(kanjiVgId).toLowerCase();
    const prev = bySvgId.get(id) ?? {
      kanjiVgId: id,
      strokeCount,
      kanaIds: [],
      kanjiIds: [],
      japanese: [],
    };
    prev.strokeCount = strokeCount;
    if (patch.kanaId) prev.kanaIds.push(patch.kanaId);
    if (patch.kanjiId) prev.kanjiIds.push(patch.kanjiId);
    if (patch.japanese) prev.japanese.push(patch.japanese);
    prev.kanaIds = [...new Set(prev.kanaIds)];
    prev.kanjiIds = [...new Set(prev.kanjiIds)];
    prev.japanese = [...new Set(prev.japanese)];
    bySvgId.set(id, prev);
  };

  for (const item of kana) {
    if (!item.strokeData) continue;
    upsert(item.strokeData.kanjiVgId, item.strokeData.strokeCount, {
      kanaId: item.id,
      japanese: item.japanese,
    });
  }

  for (const item of kanji) {
    if (!item.strokeData) continue;
    upsert(item.strokeData.kanjiVgId, item.strokeData.strokeCount, {
      kanjiId: item.id,
      japanese: item.japanese,
    });
  }

  return [...bySvgId.values()].sort((a, b) => a.kanjiVgId.localeCompare(b.kanjiVgId));
}

function countSvgStrokes(svgText) {
  const matches = svgText.match(/id="kvg:[0-9a-f]+-s\d+"/gi) ?? [];
  const nums = matches.map((m) => Number(m.match(/-s(\d+)"/i)?.[1] ?? 0));
  return nums.length ? Math.max(...nums) : 0;
}

async function fetchSvg(kanjiVgId) {
  const url = `${KANJIVG_RAW_BASE}/${kanjiVgId}.svg`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
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

  return null;
}

async function main() {
  const argv = process.argv.slice(2);
  const useFetch = argv.includes('--fetch');
  const entries = readIds();
  const sourceDir = resolveSourceDir(argv);

  if (!sourceDir && !useFetch) {
    throw new Error('Provide --source, --zip, or --fetch (download from KanjiVG GitHub)');
  }

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
  let fetched = 0;

  for (const entry of entries) {
    const dest = join(OUT_KANJI, `${entry.kanjiVgId}.svg`);
    const src = sourceDir ? join(sourceDir, `${entry.kanjiVgId}.svg`) : null;

    let svgText;
    if (src && existsSync(src)) {
      cpSync(src, dest);
      svgText = readFileSync(dest, 'utf8');
    } else if (useFetch) {
      try {
        svgText = await fetchSvg(entry.kanjiVgId);
        writeFileSync(dest, svgText);
        fetched += 1;
      } catch (err) {
        console.error(`MISSING ${entry.kanjiVgId}.svg (${entry.japanese.join(', ')}): ${err.message}`);
        missing += 1;
        continue;
      }
    } else {
      console.error(`MISSING ${entry.kanjiVgId}.svg (${entry.japanese.join(', ')})`);
      missing += 1;
      continue;
    }

    const pathCount = countSvgStrokes(svgText);
    if (pathCount !== entry.strokeCount) {
      console.warn(
        `WARN ${entry.kanjiVgId}: curriculum strokeCount=${entry.strokeCount}, svg paths=${pathCount}`,
      );
      mismatch += 1;
    }

    const row = {
      kanjiVgId: entry.kanjiVgId,
      strokeCount: entry.strokeCount,
      svgStrokeCount: pathCount,
      japanese: entry.japanese,
      path: `/kanjivg/kanji/${entry.kanjiVgId}.svg`,
    };
    if (entry.kanaIds.length) row.kanaIds = entry.kanaIds;
    if (entry.kanjiIds.length) row.kanjiIds = entry.kanjiIds;
    manifest.characters.push(row);
  }

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`KanjiVG bundle → ${OUT_KANJI}`);
  console.log(`  copied: ${manifest.characters.length}/${entries.length}`);
  if (fetched) console.log(`  fetched from GitHub: ${fetched}`);
  if (missing) {
    process.exitCode = 1;
    console.error(`  missing: ${missing}`);
  }
  if (mismatch) {
    console.warn(`  strokeCount mismatches (informational): ${mismatch}`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
