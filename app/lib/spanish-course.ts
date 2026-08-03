import type { Course, VocabularyItem } from "./types";

type DefiniteArticle = "el" | "la" | "los" | "las" | "el/la";

const CATEGORY_LABELS = [
  "最初のあいさつ・反応",
  "文を作る基本語",
  "超重要動詞",
  "形容詞・性質",
  "副詞・頻度・程度",
  "数字・時間",
  "人・家族・関係",
  "場所・移動・旅行",
  "家・日用品",
  "食べ物・飲み物",
  "体・健康・気持ち",
  "学習・仕事・お金",
  "自然・天気・動物",
  "社会・文化・抽象語",
] as const;

const ARTICLE_BY_WORD_AND_MEANING: Record<string, DefiniteArticle> = {
  "capital|首都": "la",
  "capital|資本": "el",
  "orden|秩序・順番": "el",
  "orden|命令": "la",
  "papa|じゃがいも・ラテンアメリカ": "la",
  "papa|ローマ教皇": "el",
};

// Spanish grammatical exceptions and invariant/common-gender nouns live in the
// Spanish course, never in the language-agnostic learning engine.
const ARTICLE_OVERRIDES: Record<string, DefiniteArticle> = {
  agua: "el",
  aire: "el",
  aplicación: "la",
  arte: "el",
  azúcar: "el",
  base: "la",
  bebé: "el/la",
  billete: "el",
  bolígrafo: "el",
  café: "el",
  calor: "el",
  carne: "la",
  cárcel: "la",
  celular: "el",
  clase: "la",
  clima: "el",
  cliente: "el/la",
  colega: "el/la",
  color: "el",
  comunidad: "la",
  control: "el",
  crisis: "la",
  día: "el",
  diente: "el",
  dentista: "el/la",
  dirección: "la",
  dolor: "el",
  "dolor de cabeza": "el",
  estudiante: "el/la",
  examen: "el",
  fiebre: "la",
  fin: "el",
  flor: "la",
  foto: "la",
  frase: "la",
  frente: "la",
  gafas: "las",
  gente: "la",
  guante: "el",
  hambre: "el",
  hielo: "el",
  idioma: "el",
  imagen: "la",
  inglés: "el",
  internet: "el",
  joven: "el/la",
  japonés: "el",
  lápiz: "el",
  leche: "la",
  ley: "la",
  luz: "la",
  llave: "la",
  mano: "la",
  madre: "la",
  mapa: "el",
  mar: "el",
  mente: "la",
  mitad: "la",
  mediodía: "el",
  medianoche: "la",
  móvil: "el",
  muerte: "la",
  mujer: "la",
  nivel: "el",
  noche: "la",
  nieve: "la",
  nube: "la",
  número: "el",
  ordenador: "el",
  orden: "el",
  opinión: "la",
  origen: "el",
  país: "el",
  pan: "el",
  paraguas: "el",
  parte: "la",
  padres: "los",
  pasta: "la",
  paz: "la",
  peine: "el",
  pez: "el",
  piel: "la",
  policía: "el/la",
  problema: "el",
  programa: "el",
  razón: "la",
  reunión: "la",
  raíz: "la",
  ratón: "el",
  reloj: "el",
  sal: "la",
  sangre: "la",
  sartén: "la",
  señal: "la",
  sistema: "el",
  sofá: "el",
  sol: "el",
  suerte: "la",
  suéter: "el",
  síntoma: "el",
  tema: "el",
  tos: "la",
  turista: "el/la",
  vez: "la",
  viaje: "el",
  vida: "la",
  voz: "la",
  calle: "la",
  nariz: "la",
  pared: "la",
};

const MASCULINE_NUMBER_WORDS = new Set([
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
  "dieciocho", "diecinueve", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta",
  "setenta", "ochenta", "noventa", "cien", "ciento", "doscientos", "mil",
]);

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (character === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (value || row.length) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function resolveArticle(target: string, meaning: string, partOfSpeech: string): DefiniteArticle | null {
  if (!partOfSpeech.split("・").includes("名詞")) {
    return null;
  }

  const normalized = target.toLocaleLowerCase("es");
  const exact = ARTICLE_BY_WORD_AND_MEANING[`${normalized}|${meaning}`];
  if (exact) {
    return exact;
  }
  if (ARTICLE_OVERRIDES[normalized]) {
    return ARTICLE_OVERRIDES[normalized];
  }
  if (MASCULINE_NUMBER_WORDS.has(normalized)) {
    return "el";
  }

  const firstWord = normalized.split(/\s+/)[0];
  if (ARTICLE_OVERRIDES[firstWord]) {
    return ARTICLE_OVERRIDES[firstWord];
  }
  if (normalized.endsWith("as")) {
    return "las";
  }
  if (normalized.endsWith("os")) {
    return "los";
  }
  if (
    normalized.endsWith("a") ||
    normalized.endsWith("dad") ||
    normalized.endsWith("tad") ||
    normalized.endsWith("ción") ||
    normalized.endsWith("sión") ||
    normalized.endsWith("umbre")
  ) {
    return "la";
  }
  return "el";
}

function toVocabularyItem(row: string[]): VocabularyItem | null {
  if (row.length < 6 || !row[0]) {
    return null;
  }

  const [id, , categoryId, target, meaning, partOfSpeech = "", note = ""] = row;
  const article = resolveArticle(target, meaning, partOfSpeech);
  const spokenForm = article ? `${article === "el/la" ? "el" : article} ${target}` : target;
  const acceptedSpokenForms =
    article === "el/la" ? [`el ${target}`, `la ${target}`] : [spokenForm];

  return {
    id,
    categoryId,
    target,
    meaning,
    partOfSpeech,
    note,
    spokenForm,
    acceptedSpokenForms,
  };
}

export function buildSpanishCourse(csvText: string): Course {
  const [, ...rows] = parseCsv(csvText.replace(/^\uFEFF/, ""));
  const items = rows.flatMap((row) => {
    const item = toVocabularyItem(row);
    return item ? [item] : [];
  });

  return {
    id: "ja-es-basic-1000",
    title: "スペイン語 基本1000語",
    shortTitle: "Español",
    sourceLocale: "ja-JP",
    targetLocale: "es",
    speechLocale: "es-ES",
    targetLanguageLabel: "スペイン語",
    datasetLabel: "約1,000語",
    categories: CATEGORY_LABELS.map((label) => ({ id: label, label })),
    parts: [
      {
        id: "part-1",
        label: "パート 1",
        description: "会話の入口と、文を組み立てる基本",
        categoryIds: [...CATEGORY_LABELS.slice(0, 5)],
      },
      {
        id: "part-2",
        label: "パート 2",
        description: "時間、人、場所、暮らしのことば",
        categoryIds: [...CATEGORY_LABELS.slice(5, 10)],
      },
      {
        id: "part-3",
        label: "パート 3",
        description: "身体、仕事、自然、抽象的なことば",
        categoryIds: [...CATEGORY_LABELS.slice(10)],
      },
    ],
    preferredVoiceNames: ["Google español", "Google español de España"],
    items,
  };
}
