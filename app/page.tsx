"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Word = {
  id: number;
  block: string;
  category: string;
  spanish: string;
  japanese: string;
  partOfSpeech: string;
  memo: string;
};

type Screen = "home" | "range" | "mode" | "session" | "result";
type RangeKind = "category" | "part" | "all";
type PracticeOrder = "random" | "least-touched" | "weak";
type QuestionPlan = "pronunciation-20" | "mixed-10-10" | "es-ja-20";
type StudyMode = {
  order: PracticeOrder;
  plan: QuestionPlan;
};
type QuestionKind = "es-ja" | "pronunciation";
type RecognitionStatus = "idle" | "listening" | "correct" | "miss" | "unsupported";

type Selection = {
  kind: RangeKind;
  key: string;
  label: string;
};

type Question = {
  id: string;
  kind: QuestionKind;
  word: Word;
  choices?: Word[];
  attempts: number;
  wrong: boolean;
};

type ResultStats = {
  attempts: number;
  correct: number;
  wrong: number;
};

type WordProgress = {
  seen: boolean;
  touched: number;
  wrong: number;
};

type ProgressStore = Record<number, WordProgress>;
type DefiniteArticle = "el" | "la" | "los" | "las" | "el/la";

type SessionCycle = {
  rangeKey: string;
  seenWordIds: Set<number>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const CATEGORY_ORDER = [
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

const PARTS = [
  {
    key: "part-1",
    label: "パート1",
    subtitle: "最初のあいさつ・反応〜副詞・頻度・程度",
    categories: CATEGORY_ORDER.slice(0, 5),
  },
  {
    key: "part-2",
    label: "パート2",
    subtitle: "数字・時間〜食べ物・飲み物",
    categories: CATEGORY_ORDER.slice(5, 10),
  },
  {
    key: "part-3",
    label: "パート3",
    subtitle: "体・健康・気持ち〜社会・文化・抽象語",
    categories: CATEGORY_ORDER.slice(10, 14),
  },
];

const TIMER_SECONDS = 10;
const QUESTIONS_PER_SESSION = 20;
const FEEDBACK_MS = 980;
const SPEECH_FALLBACK_BASE_MS = 1600;
const PROGRESS_STORAGE_KEY = "constlingo-word-progress-v1";
const PROGRESS_EXPORT_VERSION = 1;

const KIND_LABELS: Record<QuestionKind, string> = {
  "es-ja": "西→日",
  pronunciation: "日→西 発音",
};

const ORDER_LABELS: Record<PracticeOrder, string> = {
  random: "ランダム",
  "least-touched": "未接触優先",
  weak: "苦手順",
};

const PLAN_LABELS: Record<QuestionPlan, string> = {
  "pronunciation-20": "日→西 発音 20問",
  "mixed-10-10": "西→日 10問 + 日→西 発音 10問",
  "es-ja-20": "西→日 20問",
};

const DEFINITE_ARTICLE_OVERRIDES: Record<string, DefiniteArticle> = {
  cero: "el",
  uno: "el",
  dos: "el",
  tres: "el",
  cuatro: "el",
  cinco: "el",
  seis: "el",
  siete: "el",
  ocho: "el",
  nueve: "el",
  diez: "el",
  once: "el",
  doce: "el",
  trece: "el",
  catorce: "el",
  quince: "el",
  dieciséis: "el",
  diecisiete: "el",
  dieciocho: "el",
  diecinueve: "el",
  veinte: "el",
  treinta: "el",
  cuarenta: "el",
  cincuenta: "el",
  sesenta: "el",
  setenta: "el",
  ochenta: "el",
  noventa: "el",
  cien: "el",
  ciento: "el",
  doscientos: "el",
  mil: "el",
  mitad: "la",
  vez: "la",
  hora: "la",
  día: "el",
  semana: "la",
  mes: "el",
  año: "el",
  siglo: "el",
  momento: "el",
  noche: "la",
  mediodía: "el",
  medianoche: "la",
  lunes: "el",
  martes: "el",
  miércoles: "el",
  jueves: "el",
  viernes: "el",
  persona: "la",
  gente: "la",
  hombre: "el",
  mujer: "la",
  bebé: "el/la",
  padre: "el",
  madre: "la",
  padres: "los",
  pareja: "la",
  colega: "el/la",
  jefe: "el",
  cliente: "el/la",
  estudiante: "el/la",
  policía: "el/la",
  país: "el",
  ciudad: "la",
  capital: "la",
  calle: "la",
  parque: "el",
  jardín: "el",
  pared: "la",
  hospital: "el",
  hotel: "el",
  estación: "la",
  mapa: "el",
  dirección: "la",
  puente: "el",
  viaje: "el",
  turista: "el/la",
  pasaporte: "el",
  billete: "el",
  sofá: "el",
  estante: "el",
  luz: "la",
  interruptor: "el",
  enchufe: "el",
  llave: "la",
  papel: "el",
  peine: "el",
  suéter: "el",
  calcetín: "el",
  guante: "el",
  reloj: "el",
  gafas: "las",
  paraguas: "el",
  tenedor: "el",
  sartén: "la",
  agua: "el",
  leche: "la",
  té: "el",
  café: "el",
  pan: "el",
  arroz: "el",
  pasta: "la",
  tomate: "el",
  maíz: "el",
  frijol: "el",
  sándwich: "el",
  pastel: "el",
  carne: "la",
  nariz: "la",
  boca: "la",
  diente: "el",
  lengua: "la",
  mano: "la",
  piel: "la",
  mente: "la",
  voz: "la",
  síntoma: "el",
  fiebre: "la",
  tos: "la",
  dolor: "el",
  "dolor de cabeza": "el",
  descanso: "el",
  sueño: "el",
  dentista: "el/la",
  clase: "la",
  examen: "el",
  frase: "la",
  idioma: "el",
  español: "el",
  inglés: "el",
  japonés: "el",
  lápiz: "el",
  bolígrafo: "el",
  ordenador: "el",
  móvil: "el",
  celular: "el",
  ratón: "el",
  internet: "el",
  aplicación: "la",
  programa: "el",
  tierra: "la",
  mar: "el",
  sol: "el",
  nube: "la",
  nieve: "la",
  árbol: "el",
  raíz: "la",
  aire: "el",
  hielo: "el",
  vida: "la",
  muerte: "la",
  arte: "el",
  ley: "la",
  paz: "la",
  razón: "la",
  control: "el",
  orden: "el",
  acuerdo: "el",
  imagen: "la",
  señal: "la",
  color: "el",
  nivel: "el",
  parte: "la",
  fin: "el",
  base: "la",
  sistema: "el",
};

const DEFINITE_ARTICLE_BY_WORD_KEY: Record<string, DefiniteArticle> = {
  "capital|首都": "la",
  "capital|資本": "el",
  "orden|秩序・順番": "el",
  "orden|命令": "la",
  "papa|じゃがいも・ラテンアメリカ": "la",
  "papa|ローマ教皇": "el",
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value || row.length > 0) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeSpeech(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zñ\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function isClosePronunciation(answer: string, target: string) {
  const normalizedAnswer = normalizeSpeech(answer);
  const normalizedTarget = normalizeSpeech(target);

  if (!normalizedAnswer || !normalizedTarget) {
    return false;
  }

  if (
    normalizedAnswer === normalizedTarget ||
    normalizedAnswer.includes(normalizedTarget) ||
    normalizedTarget.includes(normalizedAnswer)
  ) {
    return true;
  }

  const distance = levenshtein(normalizedAnswer, normalizedTarget);
  const ratio = distance / Math.max(normalizedAnswer.length, normalizedTarget.length);
  return ratio <= (normalizedTarget.length <= 5 ? 0.34 : 0.28);
}

function getDefiniteArticle(word: Word) {
  if (!word.partOfSpeech.split("・").includes("名詞")) {
    return null;
  }

  const spanish = word.spanish.toLowerCase();
  const firstWord = spanish.split(/\s+/)[0];
  const wordKey = `${spanish}|${word.japanese}`;
  const override =
    DEFINITE_ARTICLE_BY_WORD_KEY[wordKey] ?? DEFINITE_ARTICLE_OVERRIDES[spanish] ?? DEFINITE_ARTICLE_OVERRIDES[firstWord];

  if (override) {
    return override;
  }

  if (spanish.endsWith("as")) {
    return "las";
  }
  if (spanish.endsWith("os")) {
    return "los";
  }
  if (spanish.endsWith("a") || spanish.endsWith("dad") || spanish.endsWith("ción") || spanish.endsWith("sión")) {
    return "la";
  }

  return "el";
}

function getPromptSpanish(word: Word) {
  const article = getDefiniteArticle(word);
  return article ? `${article} ${word.spanish}` : word.spanish;
}

function getPronunciationTargets(word: Word) {
  const article = getDefiniteArticle(word);

  if (article === "el/la") {
    return [`el ${word.spanish}`, `la ${word.spanish}`];
  }

  return [getPromptSpanish(word)];
}

function getSpokenSpanish(word: Word) {
  return getPronunciationTargets(word)[0];
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const speechWindow = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function getPreferredSpanishVoice(voices: SpeechSynthesisVoice[]) {
  const spanishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("es"));
  const exactGoogle = spanishVoices.find(
    (voice) => voice.name === "Google español" && voice.lang === "es-ES",
  );

  if (exactGoogle) {
    return exactGoogle;
  }

  return (
    [...spanishVoices].sort((a, b) => {
      const score = (voice: SpeechSynthesisVoice) => {
        const name = voice.name.toLowerCase();
        return (
          (voice.lang.toLowerCase() === "es-es" ? 50 : 0) +
          (name.includes("google") ? 30 : 0) +
          (name.includes("español") || name.includes("spanish") ? 20 : 0) +
          (voice.localService ? 5 : 0)
        );
      };

      return score(b) - score(a);
    })[0] ?? null
  );
}

function speakSpanish(text: string, voice?: SpeechSynthesisVoice | null, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  utterance.rate = 0.92;
  utterance.pitch = 1;

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

function getChoices(word: Word, pool: Word[], key: "spanish" | "japanese") {
  const used = new Set([word[key]]);
  const distractors: Word[] = [];

  for (const item of shuffle(pool.filter((candidate) => candidate.id !== word.id))) {
    if (used.has(item[key])) {
      continue;
    }
    distractors.push(item);
    used.add(item[key]);
    if (distractors.length === 3) {
      break;
    }
  }

  return shuffle([word, ...distractors]);
}

function getPracticePool(pool: Word[], order: PracticeOrder, progress: ProgressStore) {
  if (order === "random") {
    return shuffle(pool);
  }

  return pool
    .map((word) => ({ word, tieBreaker: Math.random() }))
    .sort((a, b) => {
      const progressA = progress[a.word.id];
      const progressB = progress[b.word.id];
      const touchedA = progressA?.touched ?? (progressA?.seen ? 1 : 0);
      const touchedB = progressB?.touched ?? (progressB?.seen ? 1 : 0);

      if (order === "least-touched") {
        if (touchedA !== touchedB) {
          return touchedA - touchedB;
        }
        return a.tieBreaker - b.tieBreaker;
      }

      const unseenA = !progressA?.seen;
      const unseenB = !progressB?.seen;

      if (unseenA !== unseenB) {
        return unseenA ? -1 : 1;
      }
      if (!unseenA && (progressA?.wrong ?? 0) !== (progressB?.wrong ?? 0)) {
        return (progressB?.wrong ?? 0) - (progressA?.wrong ?? 0);
      }
      return a.tieBreaker - b.tieBreaker;
    })
    .map(({ word }) => word);
}

function buildQuestion(word: Word, index: number, kind: QuestionKind, pool: Word[]) {
  return {
    id: `${kind}-${word.id}-${index}`,
    kind,
    word,
    choices: kind === "es-ja" ? getChoices(word, pool, "japanese") : undefined,
    attempts: 0,
    wrong: false,
  } satisfies Question;
}

function makeQuestionsFromSelection(selected: Word[], mode: StudyMode, pool: Word[]) {
  if (mode.plan === "mixed-10-10") {
    const questions = selected.map((word, index) => {
      const kind: QuestionKind = index < 10 ? "pronunciation" : "es-ja";
      return buildQuestion(word, index, kind, pool);
    });
    return shuffle(questions);
  }

  const kind: QuestionKind = mode.plan === "es-ja-20" ? "es-ja" : "pronunciation";
  return selected.map<Question>((word, index) => {
    return {
      ...buildQuestion(word, index, kind, pool),
    };
  });
}

function getSelectionCycleKey(selection: Selection) {
  return `${selection.kind}:${selection.key}`;
}

function getCycleAwareSelection(orderedPool: Word[], limit: number, seenWordIds: Set<number>) {
  const sessionLimit = Math.min(limit, orderedPool.length);
  const selected: Word[] = [];
  const selectedIds = new Set<number>();
  let nextSeenWordIds = new Set(seenWordIds);

  while (selected.length < sessionLimit) {
    let available = orderedPool.filter((word) => !nextSeenWordIds.has(word.id) && !selectedIds.has(word.id));

    if (available.length === 0) {
      nextSeenWordIds = new Set();
      available = orderedPool.filter((word) => !selectedIds.has(word.id));
    }

    if (available.length === 0) {
      break;
    }

    for (const word of available) {
      if (selected.length >= sessionLimit) {
        break;
      }

      selected.push(word);
      selectedIds.add(word.id);
      nextSeenWordIds.add(word.id);
    }
  }

  return { selected, seenWordIds: nextSeenWordIds };
}

function getRangeWords(words: Word[], selection: Selection | null) {
  if (!selection) {
    return [];
  }

  if (selection.kind === "all") {
    return words;
  }

  if (selection.kind === "category") {
    return words.filter((word) => word.category === selection.key);
  }

  const part = PARTS.find((item) => item.key === selection.key);
  return words.filter((word) => part?.categories.includes(word.category as (typeof CATEGORY_ORDER)[number]));
}

function calculateStats(questions: Question[]) {
  return questions.reduce<Record<QuestionKind, ResultStats>>(
    (stats, question) => {
      stats[question.kind].attempts += question.attempts;
      stats[question.kind].correct += question.attempts > 0 ? 1 : 0;
      stats[question.kind].wrong += Math.max(question.attempts - 1, 0);
      return stats;
    },
    {
      "es-ja": { attempts: 0, correct: 0, wrong: 0 },
      pronunciation: { attempts: 0, correct: 0, wrong: 0 },
    },
  );
}

function rate(correct: number, attempts: number) {
  if (attempts === 0) {
    return 0;
  }
  return Math.round((correct / attempts) * 100);
}

function formatLapCount(total: number, touched: number) {
  if (total === 0 || !Number.isFinite(touched)) {
    return "0周";
  }

  const laps = touched / total;
  return `${laps.toFixed(1).replace(/\.0$/, "")}周`;
}

function parseProgressPayload(text: string) {
  const parsed = JSON.parse(text) as { words?: unknown };
  const source = parsed.words && typeof parsed.words === "object" ? parsed.words : parsed;
  const entries = Object.entries(source as Record<string, unknown>).flatMap(([id, value]) => {
    if (!value || typeof value !== "object") {
      return [];
    }
    const item = value as Partial<WordProgress>;
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      return [];
    }
    const touched = Math.max(0, Number(item.touched) || (item.seen ? 1 : 0));
    return [
      [
        numericId,
        {
          seen: Boolean(item.seen) || touched > 0,
          touched,
          wrong: Math.max(0, Number(item.wrong) || 0),
        },
      ] as const,
    ];
  });
  return Object.fromEntries(entries);
}

export default function Home() {
  const [words, setWords] = useState<Word[]>([]);
  const [screen, setScreen] = useState<Screen>("home");
  const [rangeKind, setRangeKind] = useState<RangeKind | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [mode, setMode] = useState<StudyMode | null>(null);
  const [practiceOrder, setPracticeOrder] = useState<PracticeOrder>("random");
  const [questionPlan, setQuestionPlan] = useState<QuestionPlan>("mixed-10-10");
  const [progress, setProgress] = useState<ProgressStore>({});
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "miss" | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null);
  const [heard, setHeard] = useState("");
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>("idle");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finishingRef = useRef(false);
  const activeQuestionIdRef = useRef("");
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const speechFallbackTimerRef = useRef<number | null>(null);
  const progressFileRef = useRef<HTMLInputElement | null>(null);
  const sessionCycleRef = useRef<SessionCycle | null>(null);

  const selectedVoice = useMemo(() => {
    const spanishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("es"));
    return spanishVoices.find((voice) => voice.voiceURI === voiceURI) ?? getPreferredSpanishVoice(spanishVoices);
  }, [voiceURI, voices]);

  const rangeWords = useMemo(() => getRangeWords(words, selection), [selection, words]);
  const currentQuestion = questions[questionIndex];
  const stats = useMemo(() => calculateStats(questions), [questions]);
  const totalAttempts = questions.reduce((sum, question) => sum + question.attempts, 0);
  const totalCorrect = questions.filter((question) => question.attempts > 0).length;
  const wrongQuestions = questions.filter((question) => question.wrong);
  const canStart = rangeWords.length >= (questionPlan === "pronunciation-20" ? 1 : 4);
  const learnedCount = Object.values(progress).filter((item) => item.seen).length;
  const wrongCount = Object.values(progress).reduce((sum, item) => sum + item.wrong, 0);
  const seenWordCount = (targetWords: Word[]) => targetWords.filter((word) => progress[word.id]?.seen).length;
  const touchedWordCount = (targetWords: Word[]) =>
    targetWords.reduce((sum, word) => {
      const wordProgress = progress[word.id];
      const touched = wordProgress?.touched ?? (wordProgress?.seen ? 1 : 0);
      return sum + (Number.isFinite(touched) ? touched : 0);
    }, 0);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  useEffect(() => {
    const loader = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
        if (!stored) {
          return;
        }

        setProgress(parseProgressPayload(stored));
      } catch {
        setProgress({});
      } finally {
        setProgressLoaded(true);
      }
    }, 0);

    return () => window.clearTimeout(loader);
  }, []);

  useEffect(() => {
    if (!progressLoaded) {
      return;
    }
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  }, [progress, progressLoaded]);

  useEffect(() => {
    let active = true;

    fetch("/spanish_first_1000_words_jp.csv")
      .then((response) => response.text())
      .then((text) => {
        if (!active) {
          return;
        }

        const [, ...rows] = parseCsv(text.replace(/^\uFEFF/, ""));
        const parsed = rows
          .filter((row) => row.length >= 5 && row[0])
          .map<Word>((row) => ({
            id: Number(row[0]),
            block: row[1],
            category: row[2],
            spanish: row[3],
            japanese: row[4],
            partOfSpeech: row[5] ?? "",
            memo: row[6] ?? "",
          }));

        setWords(parsed);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      setVoiceURI((current) => {
        if (current && available.some((voice) => voice.voiceURI === current)) {
          return current;
        }
        return getPreferredSpanishVoice(available)?.voiceURI ?? "";
      });
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
      if (speechFallbackTimerRef.current !== null) {
        window.clearTimeout(speechFallbackTimerRef.current);
      }
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const cancelSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    if (speechFallbackTimerRef.current !== null) {
      window.clearTimeout(speechFallbackTimerRef.current);
      speechFallbackTimerRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  }, []);

  const resetAnswerState = useCallback(() => {
    clearFeedbackTimer();
    stopRecognition();
    cancelSpeech();
    activeQuestionIdRef.current = "";
    finishingRef.current = false;
    setAnswered(false);
    setFeedback(null);
    setSelectedChoiceId(null);
    setHeard("");
    setRecognitionStatus("idle");
    setTimeLeft(TIMER_SECONDS);
  }, [cancelSpeech, clearFeedbackTimer, stopRecognition]);

  const startSession = useCallback(
    (nextMode: StudyMode, retryQuestions?: Question[], allowDuplicates = false) => {
      if (!selection) {
        return;
      }

      let nextQuestions: Question[];

      if (retryQuestions) {
        nextQuestions = retryQuestions.map((question, index) => ({
          ...question,
          id: `${question.kind}-${question.word.id}-retry-${index}-${Date.now()}`,
          attempts: 0,
          wrong: false,
        }));
      } else if (allowDuplicates) {
        const orderedPool = getPracticePool(rangeWords, nextMode.order, progress);
        const selected = orderedPool.slice(0, Math.min(QUESTIONS_PER_SESSION, orderedPool.length));
        nextQuestions = makeQuestionsFromSelection(selected, nextMode, rangeWords);
      } else {
        const rangeKey = getSelectionCycleKey(selection);
        const currentCycle =
          sessionCycleRef.current?.rangeKey === rangeKey
            ? sessionCycleRef.current
            : { rangeKey, seenWordIds: new Set<number>() };
        const orderedPool = getPracticePool(rangeWords, nextMode.order, progress);
        const nextSelection = getCycleAwareSelection(
          orderedPool,
          QUESTIONS_PER_SESSION,
          currentCycle.seenWordIds,
        );

        sessionCycleRef.current = {
          rangeKey,
          seenWordIds: nextSelection.seenWordIds,
        };
        nextQuestions = makeQuestionsFromSelection(nextSelection.selected, nextMode, rangeWords);
      }

      setMode(nextMode);
      setQuestions(nextQuestions);
      setQuestionIndex(0);
      resetAnswerState();
      setScreen("session");
    },
    [progress, rangeWords, resetAnswerState, selection],
  );

  const finishAttempt = useCallback(
    (questionId: string, isCorrect: boolean) => {
      if (finishingRef.current || activeQuestionIdRef.current !== questionId) {
        return;
      }

      finishingRef.current = true;
      stopRecognition();
      cancelSpeech();
      setAnswered(true);
      setFeedback(isCorrect ? "correct" : "miss");
      setRecognitionStatus(isCorrect ? "correct" : "miss");

      setQuestions((current) =>
        current.map((question, index) =>
          index === questionIndex
            ? {
                ...question,
                attempts: question.attempts + 1,
                wrong: question.wrong || !isCorrect,
              }
            : question,
        ),
      );
      setProgress((current) => {
        const currentProgress = current[currentQuestion.word.id] ?? { seen: false, touched: 0, wrong: 0 };
        const currentTouched = currentProgress.touched ?? (currentProgress.seen ? 1 : 0);
        return {
          ...current,
          [currentQuestion.word.id]: {
            seen: true,
            touched: (Number.isFinite(currentTouched) ? currentTouched : 0) + 1,
            wrong: currentProgress.wrong + (isCorrect ? 0 : 1),
          },
        };
      });

      let minimumDisplayDone = false;
      let speechDone = false;
      let advanced = false;

      const completeQuestion = () => {
        if (advanced || !minimumDisplayDone || !speechDone) {
          return;
        }
        if (activeQuestionIdRef.current !== questionId) {
          return;
        }

        advanced = true;
        resetAnswerState();

        if (isCorrect) {
          setQuestionIndex((index) => {
            if (index + 1 >= questions.length) {
              setScreen("result");
              return index;
            }
            return index + 1;
          });
        }
      };

      const markSpeechDone = () => {
        if (speechDone) {
          return;
        }
        speechDone = true;
        if (speechFallbackTimerRef.current !== null) {
          window.clearTimeout(speechFallbackTimerRef.current);
          speechFallbackTimerRef.current = null;
        }
        completeQuestion();
      };

      const speechFallbackMs = Math.max(
        SPEECH_FALLBACK_BASE_MS,
        Math.min(getSpokenSpanish(currentQuestion.word).length * 220, 5200),
      );

      feedbackTimerRef.current = window.setTimeout(() => {
        feedbackTimerRef.current = null;
        minimumDisplayDone = true;
        completeQuestion();
      }, FEEDBACK_MS);

      speechFallbackTimerRef.current = window.setTimeout(markSpeechDone, speechFallbackMs);
      speakSpanish(getSpokenSpanish(currentQuestion.word), selectedVoiceRef.current, markSpeechDone);
    },
    [cancelSpeech, currentQuestion, questionIndex, questions.length, resetAnswerState, stopRecognition],
  );

  const startRecognition = useCallback(
    (question: Question) => {
      stopRecognition();
      const Recognition = getSpeechRecognition();

      if (!Recognition) {
        setRecognitionStatus("unsupported");
        return;
      }

      const recognition = new Recognition();
      recognition.lang = "es-ES";
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognitionRef.current = recognition;
      setRecognitionStatus("listening");

      recognition.onresult = (event) => {
        if (recognitionRef.current !== recognition) {
          return;
        }

        const result = event.results[event.results.length - 1];
        const transcript = result?.[0]?.transcript ?? "";
        const correct = getPronunciationTargets(question.word).some((target) =>
          isClosePronunciation(transcript, target),
        );
        setHeard(transcript);

        if (correct || result?.isFinal) {
          finishAttempt(question.id, correct);
        }
      };

      recognition.onerror = () => {
        if (recognitionRef.current === recognition) {
          finishAttempt(question.id, false);
        }
      };
      recognition.onend = () => {
        if (recognitionRef.current !== recognition) {
          return;
        }

        recognitionRef.current = null;
        finishAttempt(question.id, false);
      };

      try {
        recognition.start();
      } catch {
        finishAttempt(question.id, false);
      }
    },
    [finishAttempt, stopRecognition],
  );

  useEffect(() => {
    if (screen !== "session" || !currentQuestion || answered) {
      return;
    }

    activeQuestionIdRef.current = currentQuestion.id;
    finishingRef.current = false;

    if (currentQuestion.kind === "pronunciation") {
      const starter = window.setTimeout(() => startRecognition(currentQuestion), 240);
      return () => window.clearTimeout(starter);
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(TIMER_SECONDS - elapsed, 0);
      setTimeLeft(Math.ceil(remaining));

      if (remaining <= 0) {
        window.clearInterval(timer);
        finishAttempt(currentQuestion.id, false);
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [answered, currentQuestion, finishAttempt, screen, startRecognition]);

  const chooseRangeKind = (kind: RangeKind) => {
    setRangeKind(kind);

    if (kind === "all") {
      setSelection({ kind, key: "all", label: "全範囲" });
      setScreen("mode");
      return;
    }

    setSelection(null);
    setScreen("range");
  };

  const chooseSelection = (nextSelection: Selection) => {
    setSelection(nextSelection);
    setScreen("mode");
  };

  const selectChoice = (choice: Word) => {
    if (!currentQuestion || answered) {
      return;
    }

    setSelectedChoiceId(choice.id);
    finishAttempt(currentQuestion.id, choice.id === currentQuestion.word.id);
  };

  const giveUpQuestion = () => {
    if (!currentQuestion || answered) {
      return;
    }

    finishAttempt(currentQuestion.id, false);
  };

  const goHome = () => {
    resetAnswerState();
    sessionCycleRef.current = null;
    setScreen("home");
    setRangeKind(null);
    setSelection(null);
    setMode(null);
    setQuestions([]);
    setQuestionIndex(0);
  };

  const retryMistakes = () => {
    if (!mode || wrongQuestions.length === 0) {
      return;
    }
    startSession(mode, wrongQuestions);
  };

  const restartFresh = () => {
    if (!mode) {
      return;
    }
    startSession(mode);
  };

  const restartWithDuplicates = () => {
    if (!mode) {
      return;
    }
    startSession(mode, undefined, true);
  };

  const downloadProgress = () => {
    const payload = {
      version: PROGRESS_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      words: progress,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `constlingo-progress-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importProgress = (file: File | undefined) => {
    if (!file) {
      return;
    }

    if (
      Object.keys(progress).length > 0 &&
      !window.confirm("ブラウザに保存済みの苦手度データを上書きします。アップロードしますか？")
    ) {
      if (progressFileRef.current) {
        progressFileRef.current.value = "";
      }
      return;
    }

    file
      .text()
      .then((text) => {
        setProgress(parseProgressPayload(text));
      })
      .finally(() => {
        if (progressFileRef.current) {
          progressFileRef.current.value = "";
        }
      });
  };

  const beginConfiguredSession = () => {
    startSession({ order: practiceOrder, plan: questionPlan });
  };

  return (
    <main className="app-shell">
      {screen === "home" && (
        <section className="workspace home-screen">
          <div className="intro">
            <p className="section-label">Range</p>
            <h2>演習範囲を選択</h2>
          </div>
          <section className="progress-panel home-progress" aria-label="苦手度データ">
            <div>
              <strong>苦手度データ</strong>
              <span>{learnedCount}語学習済み / {wrongCount}回ミス</span>
            </div>
            <div className="progress-actions">
              <button type="button" onClick={downloadProgress}>
                ダウンロード
              </button>
              <button type="button" onClick={() => progressFileRef.current?.click()}>
                アップロード
              </button>
              <input
                ref={progressFileRef}
                accept="application/json"
                hidden
                type="file"
                onChange={(event) => importProgress(event.target.files?.[0])}
              />
            </div>
          </section>
          <div className="primary-grid">
            <button className="range-card" type="button" onClick={() => chooseRangeKind("category")}>
              <span>01</span>
              <strong>カテゴリー単位での演習</strong>
              <small>14カテゴリーから選択</small>
            </button>
            <button className="range-card" type="button" onClick={() => chooseRangeKind("part")}>
              <span>02</span>
              <strong>パート単位での演習</strong>
              <small>3つの大きな範囲から選択</small>
            </button>
            <button className="range-card range-card-accent" type="button" onClick={() => chooseRangeKind("all")}>
              <span>03</span>
              <strong>全範囲での演習</strong>
              <small>1000語すべてから出題</small>
            </button>
          </div>
        </section>
      )}

      {screen === "range" && rangeKind && (
        <section className="workspace">
          <div className="screen-toolbar">
            <button className="icon-button" type="button" aria-label="戻る" onClick={() => setScreen("home")}>
              ＜
            </button>
          </div>

          {rangeKind === "category" ? (
            <div className="category-grid">
              {CATEGORY_ORDER.map((category, index) => {
                const categoryWords = words.filter((word) => word.category === category);
                return (
                  <button
                    className="selection-card"
                    key={category}
                    type="button"
                    onClick={() => chooseSelection({ kind: "category", key: category, label: category })}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{category}</strong>
                    <small>
                      {categoryWords.length}/{seenWordCount(categoryWords)}・
                      {formatLapCount(categoryWords.length, touchedWordCount(categoryWords))}
                    </small>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="part-grid">
              {PARTS.map((part) => {
                const partWords = words.filter((word) =>
                  part.categories.includes(word.category as (typeof CATEGORY_ORDER)[number]),
                );
                return (
                  <button
                    className="selection-card part-card"
                    key={part.key}
                    type="button"
                    onClick={() => chooseSelection({ kind: "part", key: part.key, label: part.label })}
                  >
                    <span>{part.label}</span>
                    <strong>{part.subtitle}</strong>
                    <small>
                      {partWords.length}/{seenWordCount(partWords)}・
                      {formatLapCount(partWords.length, touchedWordCount(partWords))}
                    </small>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {screen === "mode" && selection && (
        <section className="workspace mode-screen">
          <div className="screen-toolbar">
            <button
              className="icon-button"
              type="button"
              aria-label="戻る"
              onClick={() => setScreen(selection.kind === "all" ? "home" : "range")}
            >
              ＜
            </button>
            <span>{selection.label} / {rangeWords.length}語</span>
          </div>

          <div className="intro">
            <h2>出題設定</h2>
          </div>

          <div className="settings-grid">
            <fieldset className="setting-panel">
              <legend>出題順</legend>
              <label>
                <input
                  checked={practiceOrder === "random"}
                  name="practice-order"
                  type="radio"
                  onChange={() => setPracticeOrder("random")}
                />
                <strong>純粋なランダム</strong>
              </label>
              <label>
                <input
                  checked={practiceOrder === "least-touched"}
                  name="practice-order"
                  type="radio"
                  onChange={() => setPracticeOrder("least-touched")}
                />
                <strong>未接触優先</strong>
              </label>
              <label>
                <input
                  checked={practiceOrder === "weak"}
                  name="practice-order"
                  type="radio"
                  onChange={() => setPracticeOrder("weak")}
                />
                <strong>苦手順</strong>
              </label>
            </fieldset>

            <fieldset className="setting-panel">
              <legend>問題構成</legend>
              {(["pronunciation-20", "mixed-10-10", "es-ja-20"] as const).map((plan) => (
                <label key={plan}>
                  <input
                    checked={questionPlan === plan}
                    name="question-plan"
                    type="radio"
                    onChange={() => setQuestionPlan(plan)}
                  />
                  <strong>{PLAN_LABELS[plan]}</strong>
                </label>
              ))}
            </fieldset>
          </div>

          <div className="mode-grid">
            <button className="start-button" disabled={!canStart} type="button" onClick={beginConfiguredSession}>
              演習開始
            </button>
          </div>
        </section>
      )}

      {screen === "session" && currentQuestion && (
        <section className="workspace session-screen">
          <div className="session-top">
            <button className="ghost-button" type="button" onClick={goHome}>
              終了
            </button>
            <div className="progress-meta">
              <span>{questionIndex + 1} / {questions.length}</span>
              <strong>{KIND_LABELS[currentQuestion.kind]}</strong>
            </div>
          </div>

          {currentQuestion.kind !== "pronunciation" && (
            <div className="timer-track" aria-label={`残り${timeLeft}秒`}>
              <div style={{ width: `${(timeLeft / TIMER_SECONDS) * 100}%` }} />
            </div>
          )}

          <QuestionPanel
            question={currentQuestion}
            selectedChoiceId={selectedChoiceId}
            answered={answered}
            feedback={feedback}
            heard={heard}
            recognitionStatus={recognitionStatus}
            onSelectChoice={selectChoice}
            onStartRecognition={() => startRecognition(currentQuestion)}
            onGiveUp={giveUpQuestion}
          />
        </section>
      )}

      {screen === "result" && selection && mode && (
        <section className="workspace result-screen">
          <p className="section-label">Result</p>
          <h2>{rate(totalCorrect, totalAttempts)}%</h2>
          <p>
            {selection.label} / {ORDER_LABELS[mode.order]} / {PLAN_LABELS[mode.plan]} /{" "}
            {totalCorrect}問完了・{Math.max(totalAttempts - totalCorrect, 0)}回ミス
          </p>

          <div className="stats-grid">
            {Object.entries(stats)
              .filter(([, value]) => value.attempts > 0)
              .map(([kind, value]) => (
                <div className="stat-card" key={kind}>
                  <span>{KIND_LABELS[kind as QuestionKind]}</span>
                  <strong>{rate(value.correct, value.attempts)}%</strong>
                  <small>
                    {value.correct}/{value.attempts}
                  </small>
                </div>
              ))}
          </div>

          <div className="result-actions">
            <button type="button" disabled={wrongQuestions.length === 0} onClick={retryMistakes}>
              間違えた問題のみ再挑戦
            </button>
            <button type="button" onClick={restartFresh}>
              同じ範囲・モードで新しく再挑戦
            </button>
            <button type="button" onClick={restartWithDuplicates}>
              重複ありで再挑戦
            </button>
            <button className="ghost-button" type="button" onClick={goHome}>
              ホームに戻る
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function QuestionPanel({
  question,
  selectedChoiceId,
  answered,
  feedback,
  heard,
  recognitionStatus,
  onSelectChoice,
  onStartRecognition,
  onGiveUp,
}: {
  question: Question;
  selectedChoiceId: number | null;
  answered: boolean;
  feedback: "correct" | "miss" | null;
  heard: string;
  recognitionStatus: RecognitionStatus;
  onSelectChoice: (choice: Word) => void;
  onStartRecognition: () => void;
  onGiveUp: () => void;
}) {
  const isChoice = question.kind === "es-ja";
  const promptSpanish = getPromptSpanish(question.word);
  const feedbackText =
    feedback === "correct"
      ? "⭕️"
      : question.kind === "es-ja"
        ? question.word.japanese
        : promptSpanish;

  return (
    <div className="question-shell">
      <div className="prompt-panel">
        <p className="question-kind">{KIND_LABELS[question.kind]}</p>
        {question.kind === "es-ja" && <h2 lang="es">{promptSpanish}</h2>}
        {question.kind === "pronunciation" && (
          <>
            <h2>{question.word.japanese}</h2>
            <p className="prompt-sub">スペイン語で発音</p>
          </>
        )}
        <p className="word-meta">{question.word.category}</p>
      </div>

      {feedback && <div className={`feedback-mark ${feedback}`}>{feedbackText}</div>}

      {isChoice && (
        <div className="choice-grid">
          {question.choices?.map((choice) => (
            <button
              className={selectedChoiceId === choice.id ? "choice selected" : "choice"}
              disabled={answered}
              key={choice.id}
              type="button"
              onClick={() => onSelectChoice(choice)}
            >
              {choice.japanese}
            </button>
          ))}
        </div>
      )}

      {isChoice && (
        <div className="question-actions">
          <button className="give-up-button" disabled={answered} type="button" onClick={onGiveUp}>
            わからない
          </button>
        </div>
      )}

      {question.kind === "pronunciation" && (
        <div className="speech-box">
          <button disabled={answered || recognitionStatus === "listening"} type="button" onClick={onStartRecognition}>
            マイク
          </button>
          <button className="give-up-button" disabled={answered} type="button" onClick={onGiveUp}>
            わからない
          </button>
          <div className={`speech-status ${recognitionStatus}`}>
            <span>
              {
                {
                  idle: "待機中",
                  listening: "聞き取り中",
                  correct: "OK",
                  miss: "もう一度",
                  unsupported: "音声認識非対応",
                }[recognitionStatus]
              }
            </span>
            <small>{heard ? `認識: ${heard}` : " "}</small>
          </div>
        </div>
      )}
    </div>
  );
}
