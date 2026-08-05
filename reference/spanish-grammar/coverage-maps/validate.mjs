import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const mapDirectory = dirname(fileURLToPath(import.meta.url));
const expectedHeader = [
  "source",
  "section_id",
  "parent_section_id",
  "source_title",
  "coverage_status",
  "notes",
  "derived_record_ids",
];

const maps = [
  { file: "ngle-online.tsv", source: "NGLE-ONLINE", rows: 629 },
  { file: "pcic-2006-online.tsv", source: "PCIC-2006-ONLINE", rows: 960 },
];

function fail(file, message) {
  throw new Error(`${file}: ${message}`);
}

for (const map of maps) {
  const lines = readFileSync(join(mapDirectory, map.file), "utf8").replace(/\r?\n$/, "").split("\n");
  const header = lines.shift().split("\t");
  if (header.join("\t") !== expectedHeader.join("\t")) fail(map.file, "unexpected header");
  if (lines.length !== map.rows) fail(map.file, `expected ${map.rows} data rows, found ${lines.length}`);

  const rows = lines.map((line, index) => {
    const fields = line.split("\t");
    if (fields.length !== expectedHeader.length) fail(map.file, `line ${index + 2} has ${fields.length} fields`);
    return Object.fromEntries(expectedHeader.map((field, fieldIndex) => [field, fields[fieldIndex]]));
  });
  const identifiers = new Set();

  for (const row of rows) {
    if (row.source !== map.source) fail(map.file, `${row.section_id}: unexpected source ${row.source}`);
    if (!row.section_id) fail(map.file, "empty section_id");
    if (identifiers.has(row.section_id)) fail(map.file, `duplicate section_id ${row.section_id}`);
    identifiers.add(row.section_id);
    if (!row.source_title) fail(map.file, `${row.section_id}: empty source_title`);
    if (row.coverage_status !== "unreviewed") fail(map.file, `${row.section_id}: initial status is not unreviewed`);
    if (row.notes || row.derived_record_ids) fail(map.file, `${row.section_id}: initial notes or derived IDs are not empty`);
  }

  const roots = rows.filter((row) => !row.parent_section_id);
  if (roots.length !== 1) fail(map.file, `expected one root, found ${roots.length}`);
  for (const row of rows) {
    if (row.parent_section_id && !identifiers.has(row.parent_section_id)) {
      fail(map.file, `${row.section_id}: parent ${row.parent_section_id} does not exist`);
    }
  }

  const byId = new Map(rows.map((row) => [row.section_id, row]));
  for (const row of rows) {
    const ancestors = new Set([row.section_id]);
    let parent = row.parent_section_id;
    while (parent) {
      if (ancestors.has(parent)) fail(map.file, `${row.section_id}: cycle through ${parent}`);
      ancestors.add(parent);
      parent = byId.get(parent).parent_section_id;
    }
  }

  if (map.source === "NGLE-ONLINE") {
    for (let chapter = 1; chapter <= 48; chapter += 1) {
      const row = byId.get(String(chapter));
      if (!row) fail(map.file, `missing chapter ${chapter}`);
      const expectedParent = chapter === 1 ? "cuestiones-generales" : chapter <= 11 ? "morfologia" : "sintaxis";
      if (row.parent_section_id !== expectedParent) fail(map.file, `chapter ${chapter} has unexpected division parent`);
    }
    const subsections = rows.filter((row) => /^\d+\.\d+$/.test(row.section_id));
    if (subsections.length !== 577) fail(map.file, `expected 577 numbered subsections, found ${subsections.length}`);
    for (const subsection of subsections) {
      const chapter = subsection.section_id.split(".")[0];
      if (subsection.parent_section_id !== chapter) fail(map.file, `${subsection.section_id}: parent is not chapter ${chapter}`);
    }
  }

  if (map.source === "PCIC-2006-ONLINE") {
    for (let component = 1; component <= 13; component += 1) {
      const row = byId.get(String(component));
      if (!row) fail(map.file, `missing component ${component}`);
      if (row.parent_section_id !== "niveles-referencia") fail(map.file, `component ${component} has unexpected parent`);
    }
    const indexedRows = rows.filter((row) => /^\d+(?:\.|$)/.test(row.section_id));
    if (indexedRows.length !== 950) fail(map.file, `expected 950 official-index rows, found ${indexedRows.length}`);
  }

  process.stdout.write(`${map.file}: ${rows.length} rows valid\n`);
}
