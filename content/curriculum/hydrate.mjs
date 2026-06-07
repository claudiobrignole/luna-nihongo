#!/usr/bin/env node
/**
 * Luna Nihongo — content build & validation (schema 1.1.0)
 * ------------------------------------------------------------
 * Reads the atomic repositories + per-unit JSON files, resolves
 * every *Ref into the full record, and emits a single hydrated
 * curriculum bundle the React <LearningPath /> can import.
 *
 * It also runs as a STRICT VALIDATOR: any dangling ref, any unit
 * in unitOrder without a file (or vice-versa), any duplicate id,
 * forward-looking kanji `components`, or prerequisite ordering
 * violation fails the build with a non-zero exit code.
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

/** v1.1.0 — optional until situational content is added. */
let dialogues = [];
const dialoguesPath = repoFile("dialogues");
if (existsSync(dialoguesPath)) {
  dialogues = readJson(dialoguesPath).dialogues ?? [];
}

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
const DIALOGUES = index(dialogues, "dialogues");
const ALL = new Map([...KANA, ...KANJI, ...VOCAB, ...GRAMMAR]);
const STROKE_TARGETS = new Map([...KANA, ...KANJI]);

// ---- strokeData sanity (KanjiVG id reference only) ---------------------
const KANJIVG_ID = /^[0-9a-fA-F]{5}$/;
for (const item of [...kana, ...kanji]) {
  const sd = item.strokeData;
  if (!sd) continue;
  const where = item.id;
  if (!KANJIVG_ID.test(sd.kanjiVgId ?? "")) {
    fail(`[${where}] strokeData.kanjiVgId must be a 5-digit hex codepoint`);
  }
  if (typeof sd.strokeCount !== "number" || sd.strokeCount < 1) {
    fail(`[${where}] strokeData.strokeCount must be a positive number`);
  }
}

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

const checkRubric = (rubric, where) => {
  if (!Array.isArray(rubric) || !rubric.length) fail(`[${where}] rubric must be a non-empty array`);
  rubric.forEach((item, i) => checkBi(item, `${where}[${i}]`));
};

// ---- load manifest -----------------------------------------------------
const manifest = readJson(join(HERE, "manifest.json"));
const levels = readJson(join(HERE, "levels.json")).levels;
const order = manifest.unitOrder;
const orderIndex = new Map(order.map((id, i) => [id, i]));

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

// prerequisites must exist and precede the unit in unitOrder
for (const id of order) {
  const u = units.get(id);
  for (const prereq of u.prerequisites ?? []) {
    if (!units.has(prereq)) fail(`[${id}] prerequisite "${prereq}" does not exist`);
    else if (!orderIndex.has(prereq)) fail(`[${id}] prerequisite "${prereq}" missing from unitOrder`);
    else if (orderIndex.get(prereq) >= orderIndex.get(id)) {
      fail(`[${id}] prerequisite "${prereq}" must appear before this unit in unitOrder`);
    }
  }
}

// unitMap ↔ unitOrder / unit files (warnings only — documentation drift)
if (Array.isArray(manifest.unitMap)) {
  const mapById = new Map(manifest.unitMap.map((entry) => [entry.id, entry]));
  for (const entry of manifest.unitMap) {
    if (!units.has(entry.id)) {
      warn.push(`unitMap lists "${entry.id}" but no unit file found`);
      continue;
    }
    const u = units.get(entry.id);
    if (entry.level !== u.level) {
      warn.push(`unitMap level mismatch for "${entry.id}": map=${entry.level}, file=${u.level}`);
    }
    if (entry.type !== u.type) {
      warn.push(`unitMap type mismatch for "${entry.id}": map=${entry.type}, file=${u.type}`);
    }
  }
  for (const id of order) {
    if (!mapById.has(id)) warn.push(`unit "${id}" missing from unitMap`);
  }
} else {
  warn.push("manifest.json has no unitMap array");
}

// ---- quiz + unit validators --------------------------------------------
const validateQuiz = (q, unitId) => {
  checkBi(q.prompt, `${unitId}.${q.id}.prompt`);

  if (q.type === "multiple-choice") {
    if (!Array.isArray(q.options) || q.options.length < 2) fail(`[${unitId}] ${q.id}: needs >=2 options`);
    if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex >= (q.options?.length ?? 0))
      fail(`[${unitId}] ${q.id}: correctIndex out of range`);
    for (let i = 0; i < (q.options?.length ?? 0); i++) checkBi(q.options[i], `${unitId}.${q.id}.options[${i}]`);
    return;
  }

  if (q.type === "spelling") {
    if (typeof q.answer !== "string" || !q.answer.trim()) fail(`[${unitId}] ${q.id}: spelling needs an answer`);
    return;
  }

  if (q.type === "matching") {
    if (!Array.isArray(q.pairs) || !q.pairs.length) fail(`[${unitId}] ${q.id}: matching needs pairs`);
    return;
  }

  if (q.type === "writing") {
    checkBi(q.task, `${unitId}.${q.id}.task`);
    checkRubric(q.rubric, `${unitId}.${q.id}.rubric`);
    if (typeof q.modelAnswer !== "string" || !q.modelAnswer.trim()) {
      fail(`[${unitId}] ${q.id}: writing needs a non-empty modelAnswer`);
    }
    return;
  }

  if (q.type === "stroke-order") {
    if (typeof q.targetItemId !== "string" || !q.targetItemId.trim()) {
      fail(`[${unitId}] ${q.id}: stroke-order needs targetItemId`);
    }
    if (typeof q.japanese !== "string" || !q.japanese.trim()) {
      fail(`[${unitId}] ${q.id}: stroke-order needs japanese`);
    }
    const target = STROKE_TARGETS.get(q.targetItemId);
    if (!target) {
      fail(`[${unitId}] ${q.id}: stroke-order targetItemId "${q.targetItemId}" not found in kana/kanji`);
    } else if (!target.strokeData) {
      fail(`[${unitId}] ${q.id}: target "${q.targetItemId}" has no strokeData`);
    }
    return;
  }

  fail(`[${unitId}] ${q.id}: unknown quiz type "${q.type}"`);
};

const validateSituationUnit = (u, unitId) => {
  const hasDialogue = Array.isArray(u.dialogueRefs) && u.dialogueRefs.length > 0;
  const hasStrokeQuiz = (u.quizzes ?? []).some((q) => q.type === "stroke-order");
  if (!hasDialogue && !hasStrokeQuiz) {
    fail(`[${unitId}] situation unit needs dialogueRefs or a stroke-order quiz`);
  }

  if (!Array.isArray(u.canDo) || u.canDo.length === 0) {
    fail(`[${unitId}] situation unit needs a non-empty canDo[]`);
  } else {
    u.canDo.forEach((entry, i) => checkBi(entry.statement, `${unitId}.canDo[${i}].statement`));
  }
};

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

  for (const q of u.quizzes ?? []) validateQuiz(q, id);

  if (u.type === "situation") validateSituationUnit(u, id);

  const h = {
    ...u,
    kana: resolve(u.kanaRefs, KANA, id, "kanaRefs"),
    kanji: resolve(u.kanjiRefs, KANJI, id, "kanjiRefs"),
    vocab: resolve(u.vocabRefs, VOCAB, id, "vocabRefs"),
    grammar: resolve(u.grammarRefs, GRAMMAR, id, "grammarRefs"),
    dialogues: resolve(u.dialogueRefs, DIALOGUES, id, "dialogueRefs"),
    reviewPool: resolve(u.reviewPoolRefs, ALL, id, "reviewPoolRefs"),
  };
  for (const k of [
    "kanaRefs",
    "kanjiRefs",
    "vocabRefs",
    "grammarRefs",
    "dialogueRefs",
    "reviewPoolRefs",
  ]) {
    delete h[k];
  }
  // drop empty arrays to keep payload lean
  for (const k of ["kana", "kanji", "vocab", "grammar", "dialogues", "reviewPool"]) {
    if (!h[k]?.length) delete h[k];
  }
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
console.log(`  schema: ${manifest.schemaVersion}`);
console.log(`  levels: ${levels.length}`);
console.log(`  units:  ${hydrated.length}`);
console.log(
  `  kana:   ${KANA.size}  kanji: ${KANJI.size}  vocab: ${VOCAB.size}  grammar: ${GRAMMAR.size}  dialogues: ${DIALOGUES.size}`,
);

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
