# NGLE Descriptive Architecture Report

**Status:** Initial source study

**Statement type:** Source report, except where a passage is explicitly labelled **Derived synthesis**

**Primary text studied:** `NGLE-ONLINE` (2009–2011)

**Consultation date:** 2026-08-05

**Purpose:** Record the NGLE's own analytical architecture before designing the project's grammar representation

All online source links in this report were consulted on the date above unless a citation states otherwise.

## 1. Scope and method

This report asks how the *Nueva gramática de la lengua española* identifies and relates its objects of description. It does not propose directories, database fields, a phrase-structure formalism, or an instructional sequence.

The reading had two stages:

1. The prologue and the foundational sections in chapter 1 were read for the work's declared method, units, levels, functions, and terminology.
2. Representative sections from morphology and from early, middle, and late syntax were read to see how that declared system operates in actual descriptions.

The principal foundational sample was §§1.1–1.3, 1.5–1.6, and 1.8–1.13. The representative sample was §§2.1, 4.12, 16.17, 34.5, 37.1, 39.1, 39.5, 40.1, and 40.3. This is an architecture study, not a coverage review of every sampled chapter. The rows in the source-faithful coverage ledger therefore remain `unreviewed` until the future row-by-row disposition process is defined and performed.

This report uses the online 2009–2011 text because it provides paragraph-level navigation. Under the source registry, comparison with the revised 2025 edition remains pending. No finding below should be presented as verified against `NGLE-2025`.

## 2. Overall characterization

### 2.1 Source report

The NGLE defines grammar in the narrow sense around the structure of words, the ways words combine, and the meanings associated with those structures. Morphology studies internal word structure and formal variation; syntax studies combination, order, and the groups formed by words. Grammatical meaning is distributed across those domains rather than placed in an autonomous third component. Lexical semantics enters the description when it has consequences for grammatical behavior. Pragmatics remains distinguishable from grammar, but the NGLE treats contextual and discourse information as indispensable to the analysis of many grammatical phenomena. [`NGLE-ONLINE` §§1.1a–f](https://www.rae.es/gramática/cuestiones-generales/introducción)

The work describes grammar as combinatorial: a grammar is not primarily an inventory of expressions but a system of patterns, schemas, restrictions, and principles through which expressions are formed and interpreted. At the same time, lexicalized and semilexicalized expressions occupy intermediate positions between lexicon and grammar. [`NGLE-ONLINE` §§1.1b–d](https://www.rae.es/gramática/cuestiones-generales/introducción); [`NGLE-ONLINE` §§1.10a–e](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-ii-expresiones-lexicalizadas-y-semilexicalizadas)

The description combines traditional terminology with results from contemporary formal, functional, sentence-level, and discourse-oriented analysis. Where an issue is controversial, the NGLE may present arguments for multiple analyses, prefer one for descriptive purposes, or leave the matter open. It deliberately avoids making commitment to a single formal theory a precondition for using the grammar. [`NGLE-ONLINE` §§1.2b–e, 1.2l–n](https://www.rae.es/gramática/cuestiones-generales/clases-de-gramática-características-generales-de-esta-obra)

### 2.2 Derived synthesis

The NGLE's architecture is not one tree in which every object belongs at exactly one level. It is better understood as several intersecting descriptions:

- a constituent description, from morphological segments through nested syntactic groups and predicative structures;
- a categorial description, classifying units by morphological and distributional properties;
- a relational description, including predication, selection, complementation, modification, agreement, coreference, and scope;
- a functional description, assigning syntactic, semantic, and informational roles;
- a lexical-constructional description, relating lexical meanings and restrictions to more general combinatorial patterns;
- a discourse-pragmatic description, relating form to context, information packaging, modality, and speech acts;
- a variation description, attaching geographical, social, stylistic, register, and medium conditions to the relevant forms and constructions.

These descriptions overlap. A single expression can simultaneously be a word and a syntactically complex group; a verb group can also constitute an *oración* when its subject is unexpressed; the same semantic type of phrase can be an argument in one lexical environment and an adjunct in another. The NGLE treats such overlap as an analytical fact, not as a defect in the classification. [`NGLE-ONLINE` §§1.3b, 1.3h–m](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación); [`NGLE-ONLINE` §§1.11b, 1.11k–l](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos); [`NGLE-ONLINE` §§1.13a–b](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados)

## 3. Inventory of entities

The table lists entities that the NGLE itself uses in establishing its system. “Status in the architecture” summarizes the source; it does not define a project entity type.

| Source entity | Status in the architecture | Important qualifications | Exact source |
| --- | --- | --- | --- |
| **Morpheme** (*morfema*) | Minimal unit of morphological analysis. | The term has competing uses. The NGLE adopts the sense of a morphological segment, not every minimal meaning-bearing word and not an abstract inflectional value by itself. | [`NGLE-ONLINE` §1.3d](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación); [`NGLE-ONLINE` §§1.5a, 1.5d](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-i-morfología-flexiva-y-morfología-léxica) |
| **Root, base, affix, desinence, theme** (*raíz, base, afijo, desinencia, tema*) | Entities used to segment and describe morphological structure and derivation. | Their boundaries may be unclear, null, discontinuous, or analysis-dependent. The NGLE generally represents morphological structure hierarchically and often in binary layers. | [`NGLE-ONLINE` §§1.5e–p](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-i-morfología-flexiva-y-morfología-léxica) |
| **Inflectional information** (*información flexiva*; also one sense of *categoría*) | Grammatical content such as number, person, tense, or mood, manifested through morphological contrasts. | It must not be confused with a word class, although *categoría* is used for both notions in grammatical traditions. Inflection often has syntactic consequences. | [`NGLE-ONLINE` §1.3m](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación); [`NGLE-ONLINE` §1.5b](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-i-morfología-flexiva-y-morfología-léxica); [`NGLE-ONLINE` §1.9a](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-i-clases-de-palabras-criterios-de-clasificación) |
| **Word** (*palabra*) | Upper unit of morphology and a basic input to syntax. | Graphic word, morphological word, syntactic expression, and lexical item do not correspond one-to-one. A graphic word can contain more than one syntactic category, and a multiword expression can be one lexical item. | [`NGLE-ONLINE` §1.3e](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación); [`NGLE-ONLINE` §§1.8d–h](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-iv-sus-relaciones-con-las-sintácticas) |
| **Lexical item / lexical unit** (*pieza léxica, unidad léxica*) | A stored unit available to the combinatorial system. It may be simple or complex. | Lexical units need not be single graphic words. Complex units can preserve some internal syntactic variability. | [`NGLE-ONLINE` §§1.10a–e](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-ii-expresiones-lexicalizadas-y-semilexicalizadas); [`NGLE-ONLINE` §§1.11a, 1.11j](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos) |
| **Locution** (*locución*) | A lexicalized group whose distribution and function align it with a grammatical category. | Lexicalization and semantic transparency are gradient. Internal syntactic form does not by itself determine the locution's external category. | [`NGLE-ONLINE` §§1.10a–e](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-ii-expresiones-lexicalizadas-y-semilexicalizadas) |
| **Word class / syntactic category** (*clase de palabras, categoría sintáctica*) | An intrinsic classification based principally on combinatorial and morphological properties, with semantic criteria also contributing. | The core inventory contains nine classes, but boundaries such as pronoun–noun, adjective–determiner, and lexical–grammatical word are debated. Cross-cutting properties create “transverse” classes. | [`NGLE-ONLINE` §§1.9a–c, 1.9l–v](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-i-clases-de-palabras-criterios-de-clasificación) |
| **Syntactic group** (*grupo sintáctico*; synonyms *frase, sintagma*) | A syntactic unit organized around a head and able to perform syntactic functions. Groups can be nominal, adjectival, verbal, adverbial, and—in the NGLE's working terminology—prepositional, with more limited use of pronominal, conjunctive, and interjective groups. | A group can contain one element; it need not be a string of multiple words. Groups are recursively nested. The head status of prepositions and the recognition of some group types are controversial. | [`NGLE-ONLINE` §§1.11a–i, 1.11k–l](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos) |
| **Head** (*núcleo*) | The central category around which a group is articulated and from which the group receives major properties. | Formal and functional frameworks define the notion differently. The NGLE uses it descriptively without resolving every theoretical dispute. | [`NGLE-ONLINE` §§1.11a, 1.11g–h](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos) |
| **Predicate** (*predicado*) | In one sense, the expression predicated of a subject; in another, a lexical predicative head that selects participants. | The two senses must be kept distinct. Predicates are not only verbs: nouns, adjectives, and in some analyses adverbs and prepositions can be predicative. | [`NGLE-ONLINE` §§1.12d–e, 1.12j](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones) |
| **Argument** (*argumento*) | A participant selected by a predicate because of its lexical meaning. Arguments form an argument structure or valency. | An argument is a semantic-selection notion broader than any one syntactic function. It may be unexpressed, and its realization is affected by lexical and discourse conditions. | [`NGLE-ONLINE` §§1.12e, 1.12k–p](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones) |
| **Adjunct** (*adjunto*) | A nonselected modifier, generally optional, opposed to an argument. | Adjunct is cross-categorial and can modify lexical categories or the groups they form. *Complemento circunstancial* usually names only verbal or verb-group adjuncts and is therefore narrower. | [`NGLE-ONLINE` §§1.12f–h](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones); [`NGLE-ONLINE` §§39.1a–e](https://www.rae.es/gramática/sintaxis/introducción-los-adjuntos-como-modificadores-no-seleccionados) |
| **Attribute / predicative complement** (*atributo, complemento predicativo*) | A syntactic function whose bearer is itself predicated of a nominal or clausal referent. In the NGLE's broad use, attributes include copular and other predicative environments. | An attribute is neither an argument nor an adjunct in the ordinary opposition: it is a predicate. Traditions differ on how broadly to apply the label. | [`NGLE-ONLINE` §1.12z](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones); [`NGLE-ONLINE` §§37.1a–g, 37.1p–r](https://www.rae.es/gramática/sintaxis/introducción-variedades-del-atributo) |
| **Syntactic function** (*función sintáctica*) | A dependency relation that an expression bears within a larger structure, such as subject or direct object. | Function is relational and context-dependent; category is an intrinsic classification. Functions also exist inside groups, not only at sentence level. | [`NGLE-ONLINE` §§1.3i–j](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación); [`NGLE-ONLINE` §§1.12a–b](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones) |
| **Semantic function / role** (*función semántica, papel semántico*) | The participant role associated with a predicate, such as agent, patient, or instrument. | Role inventories and labels are theory-dependent and sometimes imprecise. The NGLE often finds it safer to identify how many participants a predicate selects and their relevant properties. | [`NGLE-ONLINE` §§1.12e, 1.12i](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones) |
| **Informational function** (*función informativa*) | A discourse value associated with an expression's contribution as background, topic, focus, new information, or related status. | In the strict dependency sense, some grammarians deny that these are “functions.” Their identification can require word order, prosody, clitic realization, register, preceding discourse, and context. | [`NGLE-ONLINE` §1.12c](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones); [`NGLE-ONLINE` §§40.1a–g](https://www.rae.es/gramática/sintaxis/introducción-información-conocida-e-información-nueva) |
| **Oración** | Minimal unit of predication, relating a subject and a predicate. It can be independent or embedded. | Predication can be nonverbal. Because Spanish permits unexpressed subjects, one expression can be both a verb group and an *oración*. “Main clause” is the complete structure containing its subordinate, not merely the remaining matrix words. | [`NGLE-ONLINE` §§1.13a–b, 1.13l](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados) |
| **Clause** (*cláusula*) | Not established as a separate general level alongside *oración* in the foundational inventory. | The NGLE subject index redirects *cláusula* to *oración*. The word remains in specialized labels such as *cláusula absoluta*. A future English-language project description must therefore not import an English clause–sentence distinction and attribute it to the NGLE without further analysis. | [`NGLE`, subject index, p. 3814, “cláusula”](https://www.rae.es/sites/default/files/indice_de_materias_gramatica.pdf); [`NGLE-ONLINE` §§1.13a–u](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados); [`NGLE-ONLINE` §37.1c](https://www.rae.es/gramática/sintaxis/introducción-variedades-del-atributo) |
| **Period** (*período*) | A larger syntactic grouping of *oraciones*, used particularly for certain multi-member constructions. | It is a syntactic unit, whereas the utterance belongs to discourse analysis. | [`NGLE-ONLINE` §1.3g](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación) |
| **Utterance** (*enunciado*) | Minimal communicative unit. It belongs to discourse analysis rather than being defined by a particular internal constituent shape. | A word, group, or *oración* can be an utterance under suitable formal, contextual, and discourse conditions. Non-sentential utterances may depend on prior discourse or the speech situation for interpretation. | [`NGLE-ONLINE` §1.3g](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación); [`NGLE-ONLINE` §§1.13f–i](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados) |
| **Construction** (*construcción*) | A structural pattern or configuration used to state a grammatical generalization. | The NGLE sometimes uses the term deliberately without committing to a disputed internal segmentation. Constructions range from productive patterns to partially lexicalized configurations. | [`NGLE-ONLINE` §§1.10d–e](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-ii-expresiones-lexicalizadas-y-semilexicalizadas); [`NGLE-ONLINE` §§1.13p–u](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados) |
| **Variant** (*variante*) | A form or construction whose distribution may be geographical, social, stylistic, diachronic, register-sensitive, or medium-sensitive. | Variation is described together with form, meaning, grammatical conditions, and prestige. An attested form is not automatically a recommended standard form, and no single country's usage is the unique standard. | [`NGLE-ONLINE` §§1.2h–k](https://www.rae.es/gramática/cuestiones-generales/clases-de-gramática-características-generales-de-esta-obra); [`NGLE`, Prologue, pp. XLII–XLV](https://www.rae.es/sites/default/files/prologo_nueva_gramatica.pdf) |

## 4. Inventory of relationships

The architecture depends as much on relations as on entities. The NGLE explicitly distinguishes substantive units from the relations that hold among them. [`NGLE-ONLINE` §§1.3i–m](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación)

| Relationship | Relata | What the relationship contributes | Exact source |
| --- | --- | --- | --- |
| **Constituency / inclusion** | Segment, word, group, *oración* | Represents internal hierarchical layers and recursive embedding. Linear adjacency and expression length do not determine constituency. | [`NGLE-ONLINE` §§1.3b, 1.3f–h](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación); [`NGLE-ONLINE` §§1.11c–e, 1.11k–l](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos) |
| **Head–expansion** | Lexical category and syntactic group | A group expands a noun, adjective, verb, adverb, or—under the NGLE's working analysis—preposition, and inherits major properties from its head. | [`NGLE-ONLINE` §§1.11a, 1.11c–i](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos) |
| **Predication** | Subject and predicate; predicate and bearer of a property | Constitutes an *oración* and also underlies attributive and secondary-predicate structures. It need not be verbal. | [`NGLE-ONLINE` §1.12d](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones); [`NGLE-ONLINE` §§1.13a–b](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados); [`NGLE-ONLINE` §§37.1a–g](https://www.rae.es/gramática/sintaxis/introducción-variedades-del-atributo) |
| **Selection / government** (*selección, rección*) | Predicate or other lexical head and dependent | A head's lexical meaning and combinatorial properties license or require dependents of particular kinds. | [`NGLE-ONLINE` §1.3k](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación); [`NGLE-ONLINE` §§1.12e, 1.12m–p](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones) |
| **Argument realization** | Semantic participant and syntactic expression/function | Connects a predicate's valency with subjects, objects, prepositional complements, or implicit participants. Mapping is not one-to-one. | [`NGLE-ONLINE` §§1.12k–p, 1.12x–y](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones) |
| **Modification** | Adjunct and lexical category or group | Adds nonselected descriptive or circumstantial content. Adjuncts are not confined to verb groups. | [`NGLE-ONLINE` §§39.1a–e](https://www.rae.es/gramática/sintaxis/introducción-los-adjuntos-como-modificadores-no-seleccionados) |
| **Agreement** (*concordancia*) | Morphological features of two or more expressions | Connects inflection and syntax. A noun's gender can be manifested throughout its group, and the group—not only the head word—enters a syntactic relation such as subject. | [`NGLE-ONLINE` §1.8k](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-iv-sus-relaciones-con-las-sintácticas); [`NGLE-ONLINE` §§2.1a–b](https://www.rae.es/gramática/morfología/definición-clases-de-género-sus-características-fundamentales) |
| **Paradigmatic contrast** | Alternative forms or units | Organizes possible substitutions and inflectional paradigms. | [`NGLE-ONLINE` §1.3j](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación); [`NGLE-ONLINE` §1.5b](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-i-morfología-flexiva-y-morfología-léxica) |
| **Syntagmatic combination** | Co-occurring units | Organizes the combinations through which larger expressions are built. | [`NGLE-ONLINE` §§1.3j–k](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación) |
| **Coordination and subordination** | Words, groups, and *oraciones* | Relate units at multiple levels; they are not operations restricted to complete *oraciones*. | [`NGLE-ONLINE` §§1.13l–u](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados) |
| **Coreference and scope** | Expressions and their interpretations | Cross-cut constituent classification and help state interpretive dependencies. | [`NGLE-ONLINE` §1.3l](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación) |
| **Lexicalization** | Free syntactic pattern and stored lexical unit | Forms a continuum from productive combination through semilexicalized expression to locution. Internal syntactic behavior can remain visible after lexicalization. | [`NGLE-ONLINE` §§1.10a–e](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-ii-expresiones-lexicalizadas-y-semilexicalizadas); [`NGLE-ONLINE` §§1.11a, 1.11j](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos) |
| **Information packaging** | Syntactic segment, utterance, and discourse context | Relates order, prosody, expression or omission, clitic resumption, and construction choice to topic, focus, background, and new information. | [`NGLE-ONLINE` §§40.1a–g](https://www.rae.es/gramática/sintaxis/introducción-información-conocida-e-información-nueva); [`NGLE-ONLINE` §§40.3a–b, 40.3t–x](https://www.rae.es/gramática/sintaxis/el-concepto-de-tópico-ii-vínculos-sintácticos-y-discursivos-entre-el-tópico-y-la-oración-a-la-que-corresponde) |
| **Contextual licensing / interpretation** | Form, utterance, speech act, and situation | Determines whether a form realizes a particular communicative act or supplies recoverable omitted content. A syntactic type does not map mechanically to one speech act. | [`NGLE-ONLINE` §§1.13c–i](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados) |
| **Distribution of variants** | Form or construction and population/context dimensions | Relates a grammatical option to geography, social group, prestige, register, medium, or historical period without turning those labels into grammatical categories. | [`NGLE-ONLINE` §§1.2h–k](https://www.rae.es/gramática/cuestiones-generales/clases-de-gramática-características-generales-de-esta-obra); [`NGLE`, Prologue, pp. XLII–XLV](https://www.rae.es/sites/default/files/prologo_nueva_gramatica.pdf) |

## 5. The requested distinctions

### 5.1 Words, morphological units, and syntactic groups

#### Source report

Morphology analyzes internal word structure using segments such as roots and affixes. Syntax combines lexical units into groups, but the boundary is permeable: clitic conglomerates, compounds, and multiword lexical units can show properties of more than one domain. The NGLE explicitly declines to create a separate discipline called “morphosyntax”; it instead describes the interfaces between morphology and syntax. [`NGLE-ONLINE` §§1.5a–e](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-i-morfología-flexiva-y-morfología-léxica); [`NGLE-ONLINE` §§1.8a–n](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-iv-sus-relaciones-con-las-sintácticas)

Syntactic groups are theoretically defined constituents, not simply multiword strings. They may contain one word, be recursively nested, and share a span with a word or an *oración*. Their structure is hierarchical: an outer modifier can take an already expanded group as its domain. [`NGLE-ONLINE` §§1.11b–e, 1.11k–l](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos)

#### Derived synthesis

The NGLE therefore does not support a representation in which `morpheme < word < phrase < sentence` is an exceptionless sequence of nonoverlapping containers. The later project representation will need to preserve both composition and cases of analytical overlap, but this report does not decide how.

### 5.2 Categories and grammatical functions

#### Source report

A category identifies what class an expression belongs to on the basis of its intrinsic morphological and distributional properties. A function identifies the dependency relation it bears in a particular structure. Consequently, one category can realize several functions, and one function can be realized by several categories or group types. [`NGLE-ONLINE` §§1.3i–j](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación); [`NGLE-ONLINE` §§1.9a–c](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-i-clases-de-palabras-criterios-de-clasificación); [`NGLE-ONLINE` §§1.12a–b](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones)

The NGLE distinguishes syntactic functions, semantic roles, and informational functions. These dimensions must not be collapsed: subject is not the same notion as agent, and neither is the same notion as topic. [`NGLE-ONLINE` §§1.12b–c](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones); [`NGLE-ONLINE` §§40.1a–c](https://www.rae.es/gramática/sintaxis/introducción-información-conocida-e-información-nueva)

### 5.3 Arguments, adjuncts, and attributes

#### Source report

Arguments are semantically selected participants in the lexical representation of a predicate. Adjuncts are nonselected modifiers. The distinction is not recoverable from optionality alone: arguments can be implicit, and the same broad semantic content—for example, location or measure—can be selected by one predicate and added freely to another. [`NGLE-ONLINE` §§1.12e–p](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones)

Attributes are predicative. In the NGLE's broad treatment they occur not only with copular verbs but also as secondary predicates and in other predicative configurations. Because the attribute predicates a property or state, the NGLE does not simply place it on either side of the argument–adjunct opposition. [`NGLE-ONLINE` §1.12z](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones); [`NGLE-ONLINE` §§37.1a–g, 37.1p–r](https://www.rae.es/gramática/sintaxis/introducción-variedades-del-atributo)

Traditional semantic lists of circumstantial complements do not reliably determine this architecture. The categories have fuzzy boundaries, and superficially similar prepositional groups receive different analyses depending on the predicate and lexical meaning involved. [`NGLE-ONLINE` §§39.5a–f](https://www.rae.es/gramática/sintaxis/clases-semánticas-de-adjuntos-i-límites-de-estas-clasificaciones)

### 5.4 Morphology and syntax

#### Source report

Inflectional morphology changes grammatical information within a paradigm and characteristically has syntactic consequences; lexical or derivational morphology creates distinct lexical items. Even this division has border cases. Morphological and syntactic segmentations need not align, and a word's derivational structure can interact with the complement possibilities inherited from its base. Agreement is a direct morphology–syntax relation. [`NGLE-ONLINE` §§1.5b–c, 1.5m–p](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-i-morfología-flexiva-y-morfología-léxica); [`NGLE-ONLINE` §§1.8a–n](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-iv-sus-relaciones-con-las-sintácticas)

Synchronic morphological analysis is not etymological decomposition. Productivity, transparency, present-day lexical relations, and speakers' available bases constrain which internal structures the grammar attributes to a current word. [`NGLE-ONLINE` §§1.6c–f](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-ii-morfología-sincrónica-y-diacrónica-opacidad-y-transparencia)

The gender chapter illustrates projection across the interface: gender is inherent in nouns and pronouns, is manifested by agreement, and the noun's value characterizes the nominal group that occupies a function such as subject. [`NGLE-ONLINE` §§2.1a–b](https://www.rae.es/gramática/morfología/definición-clases-de-género-sus-características-fundamentales)

### 5.5 Groups, clauses, sentences, and utterances

#### Source report

The NGLE's general predicative unit is the *oración*. It is minimally constituted by subject–predicate predication, although either the subject or the predication can lack the surface shape expected in a simple finite sentence. An *oración* may be embedded, coordinated, or independent. Groups can also be coordinated or subordinated, so those relations do not define a separate “sentence-only” level. [`NGLE-ONLINE` §§1.13a–b, 1.13l–u](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados)

The foundational account does not erect *cláusula* as a separate general entity between group and sentence; the work's subject index redirects the term to *oración*. Specialized labels containing *cláusula* do occur. This makes an automatic English mapping of *clause* and *sentence* unsafe. [`NGLE`, subject index, p. 3814, “cláusula”](https://www.rae.es/sites/default/files/indice_de_materias_gramatica.pdf); [`NGLE-ONLINE` §§1.13a–u](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados); [`NGLE-ONLINE` §37.1c](https://www.rae.es/gramática/sintaxis/introducción-variedades-del-atributo)

An utterance is defined by communicative autonomy in a context, not by being an *oración*. Words and all major group types can be complete utterances. Interpretation may require the preceding text, the speech situation, intonation, or an understood omitted element. [`NGLE-ONLINE` §§1.13f–i](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados)

#### Derived synthesis

For later project work, the English label “clause” will require an explicit project definition and mapping. It cannot be assumed to be an NGLE source entity distinct from *oración*. This is a terminology constraint, not yet a decision about our grammar schema.

### 5.6 Lexical restrictions and general constructions

#### Source report

The NGLE describes a continuum between lexically stored expressions and freely generated patterns. A locution behaves externally as a lexical item while retaining an analyzable group internally; a semilexicalized expression preserves more productive variation; a free group is generated by ordinary syntactic combination. Productive schemas can also supply templates for lexicalized expressions. [`NGLE-ONLINE` §§1.10a–e](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-ii-expresiones-lexicalizadas-y-semilexicalizadas); [`NGLE-ONLINE` §§1.11a, 1.11j](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos)

Lexical predicates impose valency and selection restrictions, but constructions can alter the realized pattern. The internal-accusative construction, for example, permits normally intransitive verbs to occur with direct objects whose meaning is morphologically or semantically related to the verb. Whether some cases are analyzed as constructionally transitivized verbs or as ordinary transitive verbs with absolute uses can depend on the lexicographic analysis adopted. Redundancy is avoided when the overt object or modifier supplies restrictive content not already included in the lexical meaning. [`NGLE-ONLINE` §§34.5a–k](https://www.rae.es/gramática/sintaxis/alternancias-de-transitividad-i-el-acusativo-interno)

#### Derived synthesis

The architecture does not reduce grammar either to lexical frames or to maximally general phrase rules. It describes interactions among lexical meaning, selection, productive construction, degree of lexicalization, and discourse licensing. Any later formalization that stores only one of those dimensions would lose source distinctions.

### 5.7 Information structure and discourse conditions

#### Source report

Informational functions evaluate how a syntactic segment contributes to an utterance: whether it is presented as topic or background, supplies new information, belongs to a contrast set, or receives focus. Word order is one resource, but subject expression, clitic presence, prosody, construction choice, register, and discourse context also contribute. [`NGLE-ONLINE` §§40.1a–f](https://www.rae.es/gramática/sintaxis/introducción-información-conocida-e-información-nueva)

The usual theme–rheme progression is a tendency with exceptions, not a structural identity between initial position and topic or between subject and topic. A proposed informational partition may also fail to correspond to a single surface constituent, and alternative analyses are recorded. [`NGLE-ONLINE` §§40.1e–j](https://www.rae.es/gramática/sintaxis/introducción-información-conocida-e-información-nueva)

Topicalization shows the interaction directly: syntactic dislocation, clitic resumption, semantic aboutness, pragmatic relevance, and discourse connection do not always coincide. Subject expression itself is discourse-sensitive and can vary geographically. [`NGLE-ONLINE` §§40.3a–b, 40.3t–x](https://www.rae.es/gramática/sintaxis/el-concepto-de-tópico-ii-vínculos-sintácticos-y-discursivos-entre-el-tópico-y-la-oración-a-la-que-corresponde)

Modal form and speech act likewise do not map one-to-one. A declarative form can perform a promise, a question can function as a request or order, and non-*oración* expressions can perform communicative acts comparable to finite *oraciones*. [`NGLE-ONLINE` §§1.13c–i](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados)

### 5.8 General Spanish and geographical variation

#### Source report

The NGLE aims at a pan-Hispanic description with a large shared core. It does not posit one country's Spanish as the unique model. It records geographical variants together with social evaluation, register, style, medium, and historical information, while acknowledging that it cannot provide the fine spatial detail of a dialectological atlas. Grammaticality and social or normative evaluation are treated as different judgments. [`NGLE-ONLINE` §§1.2h–k](https://www.rae.es/gramática/cuestiones-generales/clases-de-gramática-características-generales-de-esta-obra); [`NGLE`, Prologue, pp. XLII–XLV](https://www.rae.es/sites/default/files/prologo_nueva_gramatica.pdf)

The architecture attaches variation to the phenomenon being described. The treatment of participles relates regular and irregular forms to particular syntactic constructions and to regional preferences. The treatment of *voseo* integrates pronoun type, verbal inflection, morphosyntactic combinations, geography, social distribution, and prestige. [`NGLE-ONLINE` §§4.12c, 4.12k–l](https://www.rae.es/gramática/morfología/verbos-irregulares-iv-pretéritos-fuertes-y-participios-irregulares); [`NGLE-ONLINE` §§16.17a–j](https://www.rae.es/gramática/sintaxis/las-formas-de-tratamiento-iii-el-voseo-aspectos-sintácticos-y-sociolingüísticos)

#### Derived synthesis

“General Spanish” is the shared descriptive frame, not a variety obtained by deleting every regional form. Variation is a property of grammatical records and their distributions, not merely a separate appendix. This supports the charter's separation between describing variants and later choosing a neutral productive target, but it does not itself make that pedagogical choice.

## 6. Competing analyses and NGLE handling

The following cases are architecturally important because they show what kind of uncertainty the source preserves.

| Issue | Analyses or terminological choices recorded | NGLE's handling | Exact source |
| --- | --- | --- | --- |
| What counts as a morpheme | Minimal morphological segment; minimal sign; or abstract grammatical information | Uses *morpheme* principally for a morphological segment and keeps abstract inflectional information distinct. | [`NGLE-ONLINE` §1.5d](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-i-morfología-flexiva-y-morfología-léxica) |
| Null and discontinuous morphology | A zero segment, no segment, or a discontinuous affix; different bracketings | Presents analytical alternatives and adopts a working analysis where necessary, as with parasynthesis. | [`NGLE-ONLINE` §§1.5g, 1.5m–p](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-i-morfología-flexiva-y-morfología-léxica) |
| Synchronic word structure | Historical decomposition versus structure available in present-day grammar | Separates diachronic origin from synchronic transparency and productivity; acknowledges opaque and disputed bases. | [`NGLE-ONLINE` §§1.6c–f](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-ii-morfología-sincrónica-y-diacrónica-opacidad-y-transparencia) |
| Morphological versus syntactic unit | Compound word, syntactic compound, clitic complex, or multiword lexical item | Treats the boundary as porous and describes the evidence instead of imposing graphic-word identity. | [`NGLE-ONLINE` §§1.8d–h](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-iv-sus-relaciones-con-las-sintácticas) |
| Pronouns and other transverse categories | Separate pronoun/adjective/adverb uses versus an unexpressed nominal head; traditional versus cross-cutting classification | Usually adopts the tacit-nominal analysis where suitable but records alternatives and recognizes transverse classes. | [`NGLE-ONLINE` §§1.9l–v](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-i-clases-de-palabras-criterios-de-clasificación) |
| Preposition as head | Preposition heads a prepositional group versus preposition and obligatory term forming a different relation | Uses *grupo preposicional* while explicitly leaving the theoretical controversy unresolved. | [`NGLE-ONLINE` §§1.11g–h](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos) |
| Recognition of group types | Nominal, adjectival, verbal, and adverbial groups are broadly accepted; pronominal, conjunctive, interjective, and some prepositional analyses are disputed | Uses the additional labels when descriptively useful and states their limited acceptance. | [`NGLE-ONLINE` §§1.11f–i](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos) |
| Competing groupings inside a verb sequence | Different constituent boundaries can be supported by different syntactic processes | Preserves more than one justified segmentation rather than requiring one bracketing to answer every question. | [`NGLE-ONLINE` §1.11e](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos) |
| Semantic-role inventory | Named roles such as agent and patient versus participant counts and lexical restrictions | Uses role labels cautiously and favors more explicit selectional descriptions when labels obscure differences. | [`NGLE-ONLINE` §§1.12e, 1.12i](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones) |
| Scope of *attribute* | Only copular complement versus a broader family of predicative complements | Adopts the broader use for the specified predicative configurations while recording terminological differences. | [`NGLE-ONLINE` §§37.1a–g](https://www.rae.es/gramática/sintaxis/introducción-variedades-del-atributo) |
| Copular, semicopular, and auxiliary status | Several boundaries based on semantic bleaching, aspect, and syntactic behavior | Records intermediate cases and rejects an overly sharp universal division. | [`NGLE-ONLINE` §§37.1ñ–r](https://www.rae.es/gramática/sintaxis/introducción-variedades-del-atributo) |
| Adverbial subordinate structure | Traditional adverbial *oración* versus relative analysis, conjunction group plus term, or another constructional segmentation | Retains familiar labels when useful, introduces *grupo conjuntivo* where needed, and sometimes uses *construcción* to avoid a premature segmentation commitment. | [`NGLE-ONLINE` §§1.13n, 1.13p–u](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados) |
| Transitivity in internal-accusative patterns | Intransitive verb transitivized in a construction versus transitive verb with an absolute use | Makes the choice depend partly on the lexical or lexicographic analysis and records the boundary as unstable. | [`NGLE-ONLINE` §§34.5g–k](https://www.rae.es/gramática/sintaxis/alternancias-de-transitividad-i-el-acusativo-interno) |
| Whether informational values are functions | Dependency-based definition of function versus broader “role in the message” use | Acknowledges the strict objection and retains *función informativa* in the broader sense. | [`NGLE-ONLINE` §§40.1a–c](https://www.rae.es/gramática/sintaxis/introducción-información-conocida-e-información-nueva) |
| What counts as theme/topic | Known information, presented background, “what is spoken about,” or a variable-containing structural analysis | Records terminological dispersion, shows counterexamples to simple definitions, and relates the analyses to syntax and context. | [`NGLE-ONLINE` §§40.1d–j](https://www.rae.es/gramática/sintaxis/introducción-información-conocida-e-información-nueva) |
| Grammaticality versus correctness | Structural well-formedness versus social, normative, stylistic, or regional evaluation | Keeps the judgments distinct; an asterisk marks a grammatical exclusion, not every usage recommendation. | [`NGLE-ONLINE` §§1.2h–j](https://www.rae.es/gramática/cuestiones-generales/clases-de-gramática-características-generales-de-esta-obra) |

## 7. Terminology and usage conventions

| Preferred or central NGLE term | Alternatives or nearby terms | Reported distinction | Exact source |
| --- | --- | --- | --- |
| *morfema* | formative, segment; abstract grammatical information in other uses | The NGLE's principal use is segmental and morphological. | [`NGLE-ONLINE` §1.5d](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-i-morfología-flexiva-y-morfología-léxica) |
| *palabra* | graphic word, morphological word, lexical item | These are not interchangeable; the intended sense must be stated. | [`NGLE-ONLINE` §1.3e](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación); [`NGLE-ONLINE` §§1.8d–h](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-iv-sus-relaciones-con-las-sintácticas) |
| *categoría* / *clase de palabras* | part of speech; inflectional category | *Category* can mean a word class or grammatical information, so context must disambiguate it. | [`NGLE-ONLINE` §1.9a](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-i-clases-de-palabras-criterios-de-clasificación) |
| *grupo sintáctico* | *frase, sintagma* | The NGLE treats these as terminological equivalents for the technical constituent notion. | [`NGLE-ONLINE` §§1.11a–b, 1.11k](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos) |
| *grupo nominal, adjetival, verbal, adverbial, preposicional* | phrase labels in other traditions | Group type normally follows the head, while prepositional head status is disputed. | [`NGLE-ONLINE` §§1.11a–h](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos) |
| *núcleo* | head | A useful working notion whose theoretical definition differs across frameworks. | [`NGLE-ONLINE` §§1.11g–h](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos) |
| *complemento* | dependent of several types | It is broader than *argument* and does not by itself state whether the dependent is selected. | [`NGLE-ONLINE` §§1.12e–h, 1.12k](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones) |
| *argumento* | actant; selected complement | A lexically selected participant, not one fixed syntactic category or function. | [`NGLE-ONLINE` §§1.12e, 1.12k–p](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones) |
| *adjunto* | modifier; circumstantial; *circunstante, aditamento, satélite* | *Adjunct* is broad and cross-categorial; *complemento circunstancial* is usually limited to verbal adjuncts. | [`NGLE-ONLINE` §§39.1a–e](https://www.rae.es/gramática/sintaxis/introducción-los-adjuntos-como-modificadores-no-seleccionados) |
| *atributo* | predicative complement in narrower traditions | The NGLE adopts a broad predicative use and does not equate the attribute with an argument. | [`NGLE-ONLINE` §1.12z](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones); [`NGLE-ONLINE` §§37.1a–g](https://www.rae.es/gramática/sintaxis/introducción-variedades-del-atributo) |
| *función sintáctica* | subject, object, and other dependency labels | A relation in a structure, distinct from category and semantic role. | [`NGLE-ONLINE` §§1.12a–b](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones) |
| *función informativa* | topic/theme, rheme/comment, focus, background and numerous synonyms | A discourse contribution; not a dependency “function” under the strictest definition. | [`NGLE-ONLINE` §§40.1a–d](https://www.rae.es/gramática/sintaxis/introducción-información-conocida-e-información-nueva) |
| *oración* | *cláusula* in some traditions or translations | The foundational NGLE unit of predication; the subject index redirects *cláusula* to it. | [`NGLE-ONLINE` §§1.13a–b](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados); [`NGLE`, subject index, p. 3814, “cláusula”](https://www.rae.es/sites/default/files/indice_de_materias_gramatica.pdf) |
| *enunciado* | utterance | The minimum communicative unit; not necessarily an *oración*. | [`NGLE-ONLINE` §§1.13f–i](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados) |
| *construcción* | pattern, schema, configuration | Can be deliberately neutral about a contested internal analysis. | [`NGLE-ONLINE` §§1.13p–u](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados) |
| *locución* | lexicalized group | External category follows function and distribution, not merely internal form. | [`NGLE-ONLINE` §§1.10a–e](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-ii-expresiones-lexicalizadas-y-semilexicalizadas) |
| *variante* | regional, social, stylistic, register, spoken/written alternative | Distribution and evaluation must be stated separately from structural possibility. | [`NGLE-ONLINE` §§1.2h–k](https://www.rae.es/gramática/cuestiones-generales/clases-de-gramática-características-generales-de-esta-obra) |

This terminology table is a source-oriented concordance, not the project's approved terminology list. The `GTG-1.0-ONLINE` terminology review required by the registry remains a later task.

## 8. Architecture conclusions

### 8.1 Source-backed conclusions

1. The NGLE recognizes hierarchical constituent structure below and above the word, but does not make constituent hierarchy its only descriptive dimension. [`NGLE-ONLINE` §§1.3b–m](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación)
2. Categories, syntactic functions, semantic roles, and informational values are separate classifications with many-to-many mappings. [`NGLE-ONLINE` §§1.12a–c, 1.12k, 1.12x–y](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones)
3. Predicate selection and valency connect lexical meaning to syntax; adjunct modification and attribute predication require different relations. [`NGLE-ONLINE` §§1.12d–p, 1.12z](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones)
4. Morphology and syntax are distinguished but connected through agreement, clitics, derivational inheritance, compounds, and the grammatical effects of inflection. [`NGLE-ONLINE` §§1.8a–n](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-iv-sus-relaciones-con-las-sintácticas)
5. *Grupo*, *oración*, and *enunciado* are not simply three successively larger string sizes. One span can instantiate more than one kind, and utterance status depends on use. [`NGLE-ONLINE` §§1.11b–e](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos); [`NGLE-ONLINE` §§1.13a–b, 1.13f–i](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados)
6. Lexical items and general constructions form a graded interface rather than isolated modules. [`NGLE-ONLINE` §§1.10a–e](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-ii-expresiones-lexicalizadas-y-semilexicalizadas); [`NGLE-ONLINE` §§34.5g–k](https://www.rae.es/gramática/sintaxis/alternancias-de-transitividad-i-el-acusativo-interno)
7. Information structure and discourse conditions are grammatically relevant wherever they affect form, order, omission, prosody, or interpretation. [`NGLE-ONLINE` §§40.1a–j](https://www.rae.es/gramática/sintaxis/introducción-información-conocida-e-información-nueva)
8. Geographical and social variation belongs inside the description of relevant forms and constructions. The shared language is not obtained by silently removing variants. [`NGLE-ONLINE` §§1.2h–k](https://www.rae.es/gramática/cuestiones-generales/clases-de-gramática-características-generales-de-esta-obra); [`NGLE-ONLINE` §§16.17a–j](https://www.rae.es/gramática/sintaxis/las-formas-de-tratamiento-iii-el-voseo-aspectos-sintácticos-y-sociolingüísticos)
9. Alternative analyses are part of the source record. The NGLE frequently adopts a practical term without claiming that the underlying theoretical controversy is closed. [`NGLE-ONLINE` §§1.2l–n](https://www.rae.es/gramática/cuestiones-generales/clases-de-gramática-características-generales-de-esta-obra)

### 8.2 Derived implications to carry into the schema-design stage

These are constraints inferred from the source study, not a schema proposal:

- The future representation must be able to separate an entity's category from its functions and interpretations.
- It must support hierarchical composition without assuming that every analytical unit occupies one nonoverlapping level.
- It must attach lexical restrictions, constructional licensing, discourse conditions, and variation to grammatical claims rather than relegating them to free notes.
- It must represent alternative analyses and the NGLE's degree of commitment to each.
- It must preserve Spanish source terms and explicit mappings to any English project terms, especially for *oración*, *cláusula*, *grupo*, *argumento*, *adjunto*, and *atributo*.
- It must distinguish source description from our eventual formalization and from curriculum decisions.

## 9. Matters deliberately not decided here

This report does not decide:

- which entity types or relations become records, fields, or links;
- whether the project will adopt phrase-structure rules, feature structures, construction records, dependency relations, or a combination;
- how an English label such as “clause” will be defined internally;
- which analysis to choose where the NGLE presents alternatives;
- which phenomena are prerequisites for the early oral course;
- which regional forms are productive targets, receptive targets, or deferred;
- how the controlled 1,000-word vocabulary will constrain examples;
- how the 2025 revised edition changes any finding.

Those decisions belong to later stages and must cite this report only as a study of the source architecture, not as if it were the project's grammar schema.

## 10. Source sections consulted

### Foundational architecture

- [`NGLE-ONLINE` §1.1, “Introducción”](https://www.rae.es/gramática/cuestiones-generales/introducción)
- [`NGLE-ONLINE` §1.2, “Clases de gramática. Características generales de esta obra”](https://www.rae.es/gramática/cuestiones-generales/clases-de-gramática-características-generales-de-esta-obra)
- [`NGLE-ONLINE` §1.3, “Unidades y niveles de análisis. Primera aproximación”](https://www.rae.es/gramática/cuestiones-generales/unidades-y-niveles-de-análisis-primera-aproximación)
- [`NGLE-ONLINE` §1.5, “Unidades morfológicas (I)”](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-i-morfología-flexiva-y-morfología-léxica)
- [`NGLE-ONLINE` §1.6, “Unidades morfológicas (II)”](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-ii-morfología-sincrónica-y-diacrónica-opacidad-y-transparencia)
- [`NGLE-ONLINE` §1.8, “Unidades morfológicas (IV)”](https://www.rae.es/gramática/cuestiones-generales/unidades-morfológicas-iv-sus-relaciones-con-las-sintácticas)
- [`NGLE-ONLINE` §1.9, “Unidades sintácticas (I)”](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-i-clases-de-palabras-criterios-de-clasificación)
- [`NGLE-ONLINE` §1.10, “Unidades sintácticas (II)”](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-ii-expresiones-lexicalizadas-y-semilexicalizadas)
- [`NGLE-ONLINE` §1.11, “Unidades sintácticas (III)”](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iii-grupos-sintácticos)
- [`NGLE-ONLINE` §1.12, “Unidades sintácticas (IV)”](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-iv-funciones)
- [`NGLE-ONLINE` §1.13, “Unidades sintácticas (V)”](https://www.rae.es/gramática/cuestiones-generales/unidades-sintácticas-v-oraciones-y-enunciados)

### Representative descriptive practice

- [`NGLE-ONLINE` §2.1, gender and agreement](https://www.rae.es/gramática/morfología/definición-clases-de-género-sus-características-fundamentales)
- [`NGLE-ONLINE` §4.12, irregular participles and variation](https://www.rae.es/gramática/morfología/verbos-irregulares-iv-pretéritos-fuertes-y-participios-irregulares)
- [`NGLE-ONLINE` §16.17, *voseo*](https://www.rae.es/gramática/sintaxis/las-formas-de-tratamiento-iii-el-voseo-aspectos-sintácticos-y-sociolingüísticos)
- [`NGLE-ONLINE` §34.5, internal accusative](https://www.rae.es/gramática/sintaxis/alternancias-de-transitividad-i-el-acusativo-interno)
- [`NGLE-ONLINE` §37.1, attributes and predication](https://www.rae.es/gramática/sintaxis/introducción-variedades-del-atributo)
- [`NGLE-ONLINE` §39.1, adjuncts](https://www.rae.es/gramática/sintaxis/introducción-los-adjuntos-como-modificadores-no-seleccionados)
- [`NGLE-ONLINE` §39.5, semantic classes of adjuncts](https://www.rae.es/gramática/sintaxis/clases-semánticas-de-adjuntos-i-límites-de-estas-clasificaciones)
- [`NGLE-ONLINE` §40.1, information structure](https://www.rae.es/gramática/sintaxis/introducción-información-conocida-e-información-nueva)
- [`NGLE-ONLINE` §40.3, topic, syntax, and discourse](https://www.rae.es/gramática/sintaxis/el-concepto-de-tópico-ii-vínculos-sintácticos-y-discursivos-entre-el-tópico-y-la-oración-a-la-que-corresponde)
- [`NGLE`, Prologue](https://www.rae.es/sites/default/files/prologo_nueva_gramatica.pdf)
- [`NGLE`, subject index](https://www.rae.es/sites/default/files/indice_de_materias_gramatica.pdf)
