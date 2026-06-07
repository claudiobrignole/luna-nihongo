#!/usr/bin/env node
/**
 * Luna Nihongo — insert new units into manifest.unitOrder
 * ------------------------------------------------------------
 * Places each unit immediately AFTER the last of its prerequisites
 * in unitOrder (stable ids — Firestore progress is keyed by id).
 * Also updates unitMap. Does NOT modify unit JSON files.
 *
 * Usage:
 *   node insert-units.mjs <unit-id> [unit-id...]
 *   node insert-units.mjs --dry-run <unit-id> [...]
 *
 * Prerequisites:
 * - Unit file must exist in units/{id}.json
 * - Unit must NOT already be in unitOrder
 * - Every prerequisite must already appear in unitOrder before insertion
 *
 * No external dependencies. Node 18+.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(HERE, "manifest.json");
const UNIT_DIR = join(HERE, "units");

const DRY_RUN = process.argv.includes("--dry-run");
const unitIds = process.argv.slice(2).filter((a) => a !== "--dry-run");

if (unitIds.length === 0) {
  console.error("Usage: node insert-units.mjs [--dry-run] <unit-id> [unit-id...]");
  process.exit(1);
}

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const manifest = readJson(MANIFEST_PATH);
const order = [...manifest.unitOrder];
const unitMap = Array.isArray(manifest.unitMap) ? [...manifest.unitMap] : [];
const mapById = new Map(unitMap.map((e) => [e.id, e]));

const loadUnit = (id) => {
  const path = join(UNIT_DIR, `${id}.json`);
  try {
    return readJson(path);
  } catch {
    console.error(`✗ Unit file not found: units/${id}.json`);
    process.exit(1);
  }
};

const insertIndexFor = (unitId, currentOrder) => {
  const unit = loadUnit(unitId);
  if (currentOrder.includes(unitId)) {
    console.error(`✗ "${unitId}" is already in unitOrder`);
    process.exit(1);
  }
  if (unit.id !== unitId) {
    console.error(`✗ units/${unitId}.json has id "${unit.id}" — must match filename`);
    process.exit(1);
  }

  const prereqs = unit.prerequisites ?? [];
  let insertAt = 0;
  for (const p of prereqs) {
    const idx = currentOrder.indexOf(p);
    if (idx === -1) {
      console.error(`✗ [${unitId}] prerequisite "${p}" is not in unitOrder yet — insert prerequisites first`);
      process.exit(1);
    }
    insertAt = Math.max(insertAt, idx + 1);
  }

  return { unit, insertAt };
};

console.log(DRY_RUN ? "Dry run — no files will be written.\n" : "Inserting units into unitOrder...\n");

for (const unitId of unitIds) {
  const { unit, insertAt } = insertIndexFor(unitId, order);
  order.splice(insertAt, 0, unitId);

  const mapEntry = {
    id: unit.id,
    level: unit.level,
    type: unit.type,
    title: unit.title,
    contains: unit.description?.it?.slice(0, 120) ?? "",
    isReview: unit.type === "review",
  };
  mapById.set(unitId, mapEntry);

  console.log(`  + ${unitId} → position ${insertAt} (after index ${insertAt - 1})`);
  if (unit.prerequisites?.length) {
    console.log(`    prerequisites: ${unit.prerequisites.join(", ")}`);
  }
}

const newUnitMap = order
  .map((id) => mapById.get(id))
  .filter(Boolean);

if (order.length !== newUnitMap.length) {
  console.warn(`Warning: unitMap has ${newUnitMap.length} entries for ${order.length} units in order`);
}

if (!DRY_RUN) {
  manifest.unitOrder = order;
  manifest.unitMap = newUnitMap;
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nUpdated ${MANIFEST_PATH} (${order.length} units in unitOrder)`);
} else {
  console.log(`\nWould update unitOrder to ${order.length} units (dry run)`);
}

console.log("\nNext: npm run curriculum:check");
