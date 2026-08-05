# Spanish Grammar Description Charter

**Status:** Active initial charter

**Version:** 0.1

**Scope:** Grammar description only; curriculum and implementation are downstream work

## 1. Purpose

The Spanish grammar description is a source-backed planning resource for curriculum designers. It will describe how Spanish forms are organized, what they mean or accomplish, how they combine, and what restrictions and variation affect them.

The description will eventually support an oral-first course for Japanese-speaking adult absolute beginners, using the existing 1,000-word vocabulary and a neutral-Spanish production policy. Those course constraints determine which parts of the grammar are expanded first. They do not define the organization of the grammar in advance and do not remove other Spanish varieties from the description.

The grammar description is not:

- a learner-facing textbook or set of linguistic-analysis exercises;
- a lesson sequence or proficiency syllabus;
- an application data model;
- a replacement for the source grammar;
- a claim to reproduce all of the NGLE in abbreviated form.

## 2. Intended audience

The primary audience is the people who design, review, and implement the curriculum. The description may use grammatical terminology, source identifiers, and constituent representations when these help designers state the relevant generalizations precisely.

Learners will practise meaningful Spanish forms. They will not be expected to read this grammar, learn its terminology, draw syntactic diagrams, or reproduce its analyses.

## 3. Coverage authority and supporting evidence

The morphology and syntax volumes of the *Nueva gramática de la lengua española* (NGLE) are the primary authority for defining the coverage of the grammar description. Their complete contents are initially represented, without a project taxonomy, in the [source-faithful coverage maps](./coverage-maps/README.md).

The NGLE's own analytical distinctions have been studied separately in the [NGLE Descriptive Architecture Report](./ngle-descriptive-architecture-report.md). That report records source entities, relations, terminology, and competing analyses; it does not define the project's grammar schema.

Other authoritative references may supplement the NGLE for purposes such as terminology, second-language relevance, lexical properties, verb valency, frequency, register, and geographical distribution. Supplementary sources do not silently replace or override the NGLE. Any disagreement or difference in analytical scope must be recorded.

The exact editions, online locations, citation formats, and permitted uses approved for systematic extraction are frozen in the [Spanish Grammar Source Registry](./source-registry.md). A source or edition not admitted by that registry is not evidence for a grammatical claim.

## 4. Scope and expansion horizons

The source ledger and the descriptive entries serve different completeness goals.

### 4.1 Complete source coverage

All NGLE morphology and syntax material must appear in the source ledger at the ledger's documented level of granularity. At minimum, every numbered subsection in the official contents must receive an explicit disposition.

Complete source coverage does not require every subsection to be rewritten as a full descriptive entry. It requires every subsection to be accounted for so that advanced or difficult material cannot disappear unnoticed.

### 4.2 Priority 1: early oral grammar and its prerequisites

Grammar required for the early oral course, together with the structures and distinctions on which it depends, receives full descriptive entries first.

The early-course label is a pedagogical classification that will be assigned only after the source material has been examined. It must not be inferred solely from the current application, from an English curriculum, or from the physical organization of the grammar files.

### 4.3 Priority 2: later oral and written extensions

Material that supports later oral development, written phrase and clause construction, and more complex embedding receives full entries after the Priority 1 description is stable.

### 4.4 Priority 3: advanced and reference-only material

Advanced material may remain mapped to exact source locations until it is expanded. A deferred entry must retain enough information to identify its subject, relationships, reason for deferral, and relevant source sections.

## 5. Evidence and traceability

Every grammatical claim must be traceable to evidence.

An exact NGLE reference normally contains:

- the work identifier;
- the numbered section and, where available, lettered paragraph identifiers;
- the official online URL;
- the consultation date.

Supplementary evidence must be identified with equivalent precision appropriate to the source.

Source material should normally be paraphrased. Short quotations may be retained only when the original wording is necessary to interpret or verify a distinction. The grammar description must not reproduce substantial portions of a source.

If the available source does not support a claim, the claim must be removed, marked as unresolved, or explicitly presented as an interpretation requiring verification. Model memory is not evidence.

## 6. Types of statement

The grammar description must keep the following three kinds of statement distinguishable.

### 6.1 Source report

A source report states, in paraphrase, what an identified source describes or concludes. It requires an exact source reference.

### 6.2 Derived interpretation

A derived interpretation combines, reorganizes, or makes an inference from source material for the purposes of this grammar description. It must identify the supporting sources and explain the derivation when it is not self-evident.

A constituent schema created for this framework is a derived interpretation unless it is directly reproduced from a source's analysis.

### 6.3 Pedagogical decision

A pedagogical decision concerns matters such as production targets, prerequisites, instructional priority, prompt design, or the choice to teach one widely shared form before regional alternatives. It must include a rationale and must not be presented as a fact about Spanish grammar.

These statement types may coexist in one descriptive entry, but they must not be blended into an unattributed summary.

## 7. Treatment of variation and neutral Spanish

Geographical, social, stylistic, and register variation must be recorded when the sources identify it. A form must not be deleted from the grammar merely because it will not be a core productive target.

"Neutral Spanish" is a downstream selection policy for the curriculum, not a claim that Spanish has a single variety without regional features. Decisions about the productive core must be marked as pedagogical decisions and supported by pan-Hispanic descriptions and, where needed, evidence about current distribution.

The grammar may distinguish, when justified by evidence:

- broadly shared productive forms;
- widespread alternatives;
- geographically or socially restricted forms;
- forms intended only for later receptive recognition;
- forms excluded from a particular course, with a recorded reason.

These labels describe curriculum relevance separately from grammatical acceptability.

## 8. Completeness standards

The unqualified word *complete* must not be used for the grammar without naming the relevant standard.

### 8.1 A source ledger is coverage-complete when

- every source unit at the declared granularity has a row;
- every row has been reviewed and has an explicit disposition;
- every expanded or combined row points to the corresponding descriptive entry or entries;
- every deferred row includes a reason and source location;
- every out-of-scope row includes a scope rationale;
- no row remains blank or merely `unreviewed`.

Permitted dispositions will be defined with the ledger, but they must distinguish at least mapped, expanded, deferred, out of scope, unavailable, and unresolved material.

### 8.2 A descriptive entry is record-complete when

- its intended descriptive scope is explicit;
- its grammatical claims have exact source references;
- source reports, derived interpretations, and pedagogical decisions are distinguishable;
- relevant form, meaning or function, combinatorial restrictions, and variation are covered;
- its relationships to other known entries are recorded without implying an instructional order unless that order is separately justified;
- examples are verified and their status as sourced or project-created is clear;
- unresolved questions and source disagreements are visible;
- it has passed the review stages required for its release status.

This definition specifies required information, not a predetermined record format or grammatical taxonomy.

### 8.3 Grammar description version 1 is release-ready when

- the NGLE morphology and syntax ledger is coverage-complete;
- all material classified as necessary for early oral learning, including its grammatical prerequisites, has record-complete descriptive entries;
- every entry used by the planned curriculum is source-checked;
- regional and register-sensitive material relevant to those entries has been reviewed;
- the controlled vocabulary used in examples has the grammatical annotations required by those entries;
- no unresolved issue blocks the accurate use of an early-course entry;
- the remaining deferred material is visible through the coverage ledger;
- the release states clearly which description horizons are expanded and which remain source-mapped.

Version 1 must be described as having complete NGLE source coverage and a complete early-scope description. It must not be described as a complete rewritten grammar of Spanish while advanced source material remains deferred.

## 9. Review and approval

Work must use explicit review states. The exact workflow will be defined with the representation, but it must distinguish initial extraction, source checking, cross-checking, variation review, and approval.

LLM-assisted drafting may be used to locate relevant passages, produce traceable paraphrases, propose cross-references, and identify possible inconsistencies. It is not sufficient grounds for final grammatical approval.

An entry must not be labelled `approved` until a designated human reviewer has checked its claims and citations. Core early-course material should receive review from a person with appropriate knowledge of Spanish grammar or the teaching of Spanish as a second language.

Uncertainty is an acceptable recorded state. Concealing uncertainty to make the description appear finished is not.

## 10. Separation from curriculum design

Structural relationships in the grammar do not automatically determine instructional order. The grammar may record that one expression contains another, that two constructions contrast, or that a form depends on an agreement rule. A later curriculum process will decide when learners encounter and practise those facts.

PCIC levels, communicative usefulness, promptability, learner difficulty, and the existing vocabulary may inform that later decision. They must not be allowed to distort the source description or turn a pedagogical preference into a grammatical rule.

Lessons will reference approved grammar material rather than redefine it independently.

## 11. Maintenance

The charter may be revised when source analysis reveals that its scope or evidence rules are inadequate. Any substantive revision must record:

- what changed;
- why it changed;
- which existing ledger rows or descriptive entries are affected;
- whether previously approved material requires renewed review.

Changes to a source edition or online text must likewise be recorded and must trigger a review of the affected references.
