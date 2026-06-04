#!/usr/bin/env node
/**
 * Luna Nihongo — content build & validation
 * ------------------------------------------------------------
 * Reads the atomic repositories + per-unit JSON files, resolves
 * every *Ref into the full record, and emits a single hydrated
 * curriculum bundle the React <LearningPath /> can import.
 *
 * It also runs as a STRICT VALIDATOR: any dangling ref, any unit
 * in unitOrder without a file (or vice-versa), any duplicate id,
 * or any forward-looking kanji `components` ref fails the build
 * with a non-zero exit code. Wire this into CI before deploy.
 *
 * Usage:
 *   node hydrate.mjs            # validate + write build/curriculum.json
 *   node hydrate.mjs --check    # validate only, no output file
 *
 * No external dependencies. Node 18+.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = join(HERE, "repositories");
const UNIT_DIR = join(HERE, "units");
const BUILD_DIR = join(HERE, "build");
const CHECK_ONLY = process.argv.includes("--check");

const errors = [];
const warn = [];
const fail = (msg) => errors.push(msg);

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// ---- load repositories -------------------------------------------------
const repoFile = (name) => join(REPO_DIR, `${name}.json`);
const kana = readJson(repoFile("kana")).kana;
const kanji = readJson(repoFile("kanji")).kanji;
const vocab = readJson(repoFile("vocab")).vocab;
const grammar = readJson(repoFile("grammar")).grammar;

const index = (arr, label) => {
  const map = new Map();
  for (const r of arr) {
    if (map.has(r.id)) fail(`[${label}] duplicate id: ${r.id}`);
    map.set(r.id, r);
  }
  return map;
};
const KANA = index(kana, "kana");
const KANJI = index(kanji, "kanji");
const VOCAB = index(vocab, "vocab");
const GRAMMAR = index(grammar, "grammar");
const ALL = new Map([...KANA, ...KANJI, ...VOCAB, ...GRAMMAR]);

// ---- kanji composition must not point forward in repo order ------------
const kanjiOrder = new Map(kanji.map((k, i) => [k.id, i]));
for (const k of kanji) {
  for (const c of k.components ?? []) {
    if (!KANJI.has(c)) fail(`[kanji] ${k.id} references unknown component ${c}`);
    else if (kanjiOrder.get(c) >= kanjiOrder.get(k.id))
      fail(`[kanji] ${k.id} has a forward component ref to ${c}`);
  }
}

// ---- bilingual sanity (both locales present, non-empty) ----------------
const checkBi = (obj, where) => {
  if (!obj || typeof obj.it !== "string" || typeof obj.en !== "string" || !obj.it.trim() || !obj.en.trim())
    fail(`[i18n] missing it/en at ${where}`);
};

// ---- load manifest -----------------------------------------------------
const manifest = readJson(join(HERE, "manifest.json"));
const levels = readJson(join(HERE, "levels.json")).levels;
const order = manifest.unitOrder;

// ---- load units --------------------------------------------------------
const unitFiles = readdirSync(UNIT_DIR).filter((f) => f.endsWith(".json"));
const units = new Map();
for (const f of unitFiles) {
  const u = readJson(join(UNIT_DIR, f));
  if (u.id + ".json" !== f) warn.push(`unit id "${u.id}" != filename "${f}"`);
  if (units.has(u.id)) fail(`duplicate unit id: ${u.id}`);
  units.set(u.id, u);
}

// order <-> files consistency
for (const id of order) if (!units.has(id)) fail(`unitOrder lists "${id}" but no file found`);
for (const id of units.keys()) if (!order.includes(id)) fail(`unit file "${id}" missing from unitOrder`);

// ---- resolve refs ------------------------------------------------------
const resolve = (ids, map, unitId, field) =>
  (ids ?? []).map((id) => {
    const rec = map.get(id);
    if (!rec) fail(`[${unitId}] ${field} -> unknown ref "${id}"`);
    return rec;
  });

const hydrated = [];
for (const id of order) {
  const u = units.get(id);
  if (!u) continue;
  checkBi(u.title, `${id}.title`);
  checkBi(u.description, `${id}.description`);
  for (const q of u.quizzes ?? []) {
    checkBi(q.prompt, `${id}.${q.id}.prompt`);
    if (q.type === "multiple-choice") {
      if (!Array.isArray(q.options) || q.options.length < 2) fail(`[${id}] ${q.id}: needs >=2 options`);
      if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex >= (q.options?.length ?? 0))
        fail(`[${id}] ${q.id}: correctIndex out of range`);
    }
    if (q.type === "spelling" && (typeof q.answer !== "string" || !q.answer))
      fail(`[${id}] ${q.id}: spelling needs an answer`);
    if (q.type === "matching" && (!Array.isArray(q.pairs) || !q.pairs.length))
      fail(`[${id}] ${q.id}: matching needs pairs`);
  }
  const h = {
    ...u,
    kana: resolve(u.kanaRefs, KANA, id, "kanaRefs"),
    kanji: resolve(u.kanjiRefs, KANJI, id, "kanjiRefs"),
    vocab: resolve(u.vocabRefs, VOCAB, id, "vocabRefs"),
    grammar: resolve(u.grammarRefs, GRAMMAR, id, "grammarRefs"),
    reviewPool: resolve(u.reviewPoolRefs, ALL, id, "reviewPoolRefs"),
  };
  for (const k of ["kanaRefs", "kanjiRefs", "vocabRefs", "grammarRefs", "reviewPoolRefs"]) delete h[k];
  // drop empty arrays to keep payload lean
  for (const k of ["kana", "kanji", "vocab", "grammar", "reviewPool"]) if (!h[k].length) delete h[k];
  hydrated.push(h);
}

// ---- report ------------------------------------------------------------
if (warn.length) {
  console.warn("Warnings:");
  for (const w of warn) console.warn("  - " + w);
}
if (errors.length) {
  console.error(`\nValidation FAILED with ${errors.length} error(s):`);
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
}

console.log("Validation OK");
console.log(`  levels: ${levels.length}`);
console.log(`  units:  ${hydrated.length}`);
console.log(`  kana:   ${KANA.size}  kanji: ${KANJI.size}  vocab: ${VOCAB.size}  grammar: ${GRAMMAR.size}`);

if (!CHECK_ONLY) {
  if (!existsSync(BUILD_DIR)) mkdirSync(BUILD_DIR, { recursive: true });
  const bundle = {
    schemaVersion: manifest.schemaVersion,
    targetLevel: manifest.targetLevel,
    builtAt: new Date().toISOString(),
    levels,
    units: hydrated,
  };
  const out = join(BUILD_DIR, "curriculum.json");
  writeFileSync(out, JSON.stringify(bundle, null, 2));
  console.log(`  wrote ${out} (${hydrated.length} hydrated units)`);
}
