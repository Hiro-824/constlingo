import type {
  MasteryRecord,
  MasteryStore,
  PracticeOrder,
  QuestionKind,
  QuestionPlan,
  VocabularyItem,
} from "./types";

export const QUESTIONS_PER_SESSION = 20;
export const MASTERY_HISTORY_LIMIT = 5;

export function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function normalizeTranscript(input: string, locale: string) {
  const lowerCased = input.toLocaleLowerCase(locale).normalize("NFC");
  const language = locale.split("-")[0].toLocaleLowerCase();
  const languageNormalized =
    language === "es"
      ? lowerCased.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC")
      : lowerCased;

  return languageNormalized
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAcceptedPronunciation(
  recognized: string,
  acceptedForms: string[],
  locale: string,
) {
  const normalizedRecognized = normalizeTranscript(recognized, locale);
  if (!normalizedRecognized) {
    return false;
  }

  return acceptedForms.some(
    (form) => normalizeTranscript(form, locale) === normalizedRecognized,
  );
}

export function getMasteryKey(courseId: string, itemId: string) {
  return `${courseId}:${itemId}`;
}

export function getMasteryRecord(
  store: MasteryStore,
  courseId: string,
  itemId: string,
): MasteryRecord {
  return store[getMasteryKey(courseId, itemId)] ?? {
    receptive: [],
    productive: [],
  };
}

export function appendMasteryOutcome(
  store: MasteryStore,
  courseId: string,
  itemId: string,
  kind: Exclude<QuestionKind, "drill">,
  correct: boolean,
) {
  const key = getMasteryKey(courseId, itemId);
  const current = getMasteryRecord(store, courseId, itemId);
  return {
    ...store,
    [key]: {
      ...current,
      [kind]: [...current[kind], correct].slice(-MASTERY_HISTORY_LIMIT),
    },
  };
}

export function masteryScore(history: boolean[]) {
  if (history.length === 0) {
    return 0.5;
  }

  let totalWeight = 0;
  let correctWeight = 0;
  history.forEach((correct, index) => {
    const weight = index + 1;
    totalWeight += weight;
    if (correct) {
      correctWeight += weight;
    }
  });

  return (correctWeight + 1) / (totalWeight + 2);
}

function historyForPlan(record: MasteryRecord, plan: QuestionPlan) {
  if (plan === "receptive") {
    return record.receptive;
  }
  if (plan === "productive") {
    return record.productive;
  }
  return [...record.receptive, ...record.productive];
}

function scoreForPlan(record: MasteryRecord, plan: QuestionPlan) {
  if (plan === "mixed") {
    const receptive = record.receptive.length ? masteryScore(record.receptive) : 0.5;
    const productive = record.productive.length ? masteryScore(record.productive) : 0.5;
    return Math.min(receptive, productive);
  }
  return masteryScore(historyForPlan(record, plan));
}

export function getPracticePool(
  items: VocabularyItem[],
  order: PracticeOrder,
  plan: QuestionPlan,
  mastery: MasteryStore,
  courseId: string,
) {
  if (order === "random" || plan === "drill") {
    return shuffle(items);
  }

  return items
    .map((item) => {
      const record = getMasteryRecord(mastery, courseId, item.id);
      return {
        item,
        attempts: historyForPlan(record, plan).length,
        score: scoreForPlan(record, plan),
        tie: Math.random(),
      };
    })
    .sort((left, right) => {
      if (order === "least-practiced" && left.attempts !== right.attempts) {
        return left.attempts - right.attempts;
      }
      if (order === "low-mastery" && left.score !== right.score) {
        return left.score - right.score;
      }
      return left.tie - right.tie;
    })
    .map(({ item }) => item);
}

export function masteryLabel(record: MasteryRecord, plan: QuestionPlan) {
  const attempts = historyForPlan(record, plan).length;
  if (attempts === 0) {
    return "未確認";
  }

  const score = scoreForPlan(record, plan);
  if (score >= 0.78 && attempts >= 3) {
    return "定着";
  }
  if (score <= 0.46) {
    return "要復習";
  }
  return "練習中";
}
