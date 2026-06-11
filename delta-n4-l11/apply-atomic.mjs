#!/usr/bin/env node
/**
 * Applica il delta ATOMICO N4 Livello 11 ai repository (append/merge per-id).
 * Va eseguito PRIMA di copiare le unità e PRIMA di curriculum:insert.
 *
 * Uso (dalla radice del repo):
 *   node delta-n4-l11/apply-atomic.mjs --delta delta-n4-l11 [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const args=process.argv.slice(2);
const dry=args.includes("--dry-run");
const di=args.indexOf("--delta");
const DELTA=di>=0?args[di+1]:"delta-n4-l11";
const REPO="content/curriculum/repositories";
const ROOT="content/curriculum";
const rj=p=>JSON.parse(readFileSync(p,"utf8"));
const log=[];

// grammar
{
  const t=join(REPO,"grammar.json"); const cur=rj(t);
  const have=new Set(cur.grammar.map(r=>r.id));
  let a=0,s=0; for(const r of rj(join(DELTA,"delta.grammar.json")).grammar){if(have.has(r.id)){s++;continue;}cur.grammar.push(r);have.add(r.id);a++;}
  log.push(`grammar: +${a} (${s} già presenti) → ${cur.grammar.length}`);
  if(!dry) writeFileSync(t,JSON.stringify(cur,null,2));
}
// kanji
{
  const t=join(REPO,"kanji.json"); const cur=rj(t);
  const have=new Set(cur.kanji.map(r=>r.id));
  let a=0,s=0; for(const r of rj(join(DELTA,"delta.kanji.json")).kanji){if(have.has(r.id)){s++;continue;}cur.kanji.push(r);have.add(r.id);a++;}
  log.push(`kanji: +${a} (${s} già presenti) → ${cur.kanji.length}`);
  if(!dry) writeFileSync(t,JSON.stringify(cur,null,2));
}
// levels (optional — skip if delta.levels.json absent)
{
  const levelsPath = join(DELTA, "delta.levels.json");
  if (!existsSync(levelsPath)) {
    const cur = rj(join(ROOT, "levels.json"));
    log.push(`levels: skip (no delta.levels.json) → ${cur.levels.length}`);
  } else {
    const t = join(ROOT, "levels.json");
    const cur = rj(t);
    const have = new Set(cur.levels.map((r) => r.level));
    let a = 0,
      s = 0;
    for (const r of rj(levelsPath).levels) {
      if (have.has(r.level)) {
        s++;
        continue;
      }
      cur.levels.push(r);
      have.add(r.level);
      a++;
    }
    cur.levels.sort((x, y) => x.level - y.level);
    log.push(`levels: +${a} (${s} già presenti) → ${cur.levels.length}`);
    if (!dry) writeFileSync(t, JSON.stringify(cur, null, 2));
  }
}
console.log((dry?"[DRY-RUN] ":"")+"delta atomico N4-L11:");
for(const l of log) console.log("  - "+l);
console.log(dry?"\nNessun file scritto.":"\nFatto. Ora: append del dialogo, copia unità, curriculum:insert, curriculum:check.");
