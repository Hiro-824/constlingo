# Source-Faithful Coverage Maps

**Status:** Initial extraction; all coverage units are unreviewed  
**Map version:** 0.1  
**Extraction date:** 2026-08-05

## Purpose

These flat ledgers record source coverage before the project constructs its own grammar description. They preserve the sources' labels, order, and parent-child relationships. They do not assign lesson priority, propose a phrase-structure analysis, or sort material into project categories such as noun phrases, verb phrases, or clauses.

The maps are inventories of material to review. Their rows are not grammatical claims and are not descriptive entries. A later descriptive record may draw on multiple source rows, and one source row may support multiple records; those relationships will be recorded in `derived_record_ids` only after review.

## Files and declared granularity

### `ngle-online.tsv`

This map represents `NGLE-ONLINE`, the official online presentation of the 2009–2011 *Nueva gramática de la lengua española*. Its row order and hierarchy are transcribed from the RAE's official contents PDF.

The declared coverage units are:

- the root work;
- the three source divisions *Cuestiones generales*, *Morfología*, and *Sintaxis*;
- all 48 numbered chapters; and
- all 577 numbered subsections listed under those chapters.

Thus the map has 629 data rows. Editorial front matter, volume break labels, page numbers, and back matter are not grammar-coverage units at this granularity. Their exclusion is explicit; it must not be interpreted as a reviewed `out_of_scope` disposition.

This map is not a map of `NGLE-2025`. As required by the source registry, comparison with the revised 2025 edition remains pending. No unqualified claim of current-edition completeness may be based on this file.

Official extraction sources:

- <https://www.rae.es/gramática/>
- <https://www.rae.es/sites/default/files/Indice_contenidos_gramatica.pdf>

### `pcic-2006-online.tsv`

This is a separate map of `PCIC-2006-ONLINE`. It preserves the online work's own hierarchy rather than fitting PCIC topics into NGLE or project categories.

The declared coverage units are:

- the root work;
- *Preliminares* and its seven linked documents;
- *Plan curricular. Niveles de referencia*;
- all 13 numbered components in the official index; and
- all 937 introduction, inventory, relationship, glossary, and nested heading items displayed under those components.

Thus the map has 960 data rows. The map covers the whole official PCIC index so that its grammar component remains in its original curricular context. It records index metadata only: it does not copy the level-specific inventory descriptions or examples. Level-specific page and anchor references will be added when a row is reviewed and used.

Official extraction sources:

- <https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/>
- <https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/indice.htm>

## Ledger schema

Both files are UTF-8 tab-separated values with the same seven columns:

| Column | Meaning |
| --- | --- |
| `source` | Exact source ID from `source-registry.md`. |
| `section_id` | Stable identifier within this map. Numbered source labels are retained inside the identifier; slugs are used only for unnumbered source nodes. |
| `parent_section_id` | The source-hierarchy parent. It is empty only on the root row. |
| `source_title` | Source heading in plain text. Typographic emphasis is flattened, but wording is not translated into a project label. |
| `coverage_status` | Review state. Every initial row is `unreviewed`. |
| `notes` | Initially empty. Later source-review notes must remain distinct from derived interpretation and pedagogical decisions. |
| `derived_record_ids` | Initially empty. Later, pipe-separated IDs of project descriptive records derived from or supported by the row. |

## Initial-state invariants

For map version 0.1:

- every section ID is unique within its source;
- every non-root parent exists in the same file;
- every row has `coverage_status` set to `unreviewed`;
- `notes` and `derived_record_ids` are empty;
- row order follows the official source order; and
- neither filenames nor identifiers encode a project grammar taxonomy.

Changing a title or parent relationship requires checking the cited official index. Adding interpretations, priority, prerequisite, or curriculum labels belongs to later artifacts, not these maps.

Run `node reference/spanish-grammar/coverage-maps/validate.mjs` from the repository root to check the schema, row counts, unique IDs, parent links, acyclic hierarchy, and initial status fields.
