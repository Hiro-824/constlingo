"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  appendMasteryOutcome,
  DEFAULT_QUESTION_COUNT,
  getPracticePool,
  isAcceptedPronunciation,
  shuffle,
} from "../lib/learning";
import type {
  Course,
  MasteryStore,
  Question,
  QuestionKind,
  QuestionPlan,
  QuestionSelectionMethod,
  QuestionSelectionSettings,
  Selection,
  StudyMode,
  VocabularyItem,
} from "../lib/types";

export type AppScreen = "library" | "setup" | "session" | "result";
type RecognitionStatus =
  | "idle"
  | "preparing"
  | "listening"
  | "correct"
  | "miss"
  | "no-match"
  | "unsupported";

type PlaybackPurpose = "feedback" | "manual" | "drill-model";
type DrillPhase = "model" | "listening" | "result" | "complete" | "unsupported";

type Feedback = {
  status: "correct" | "miss";
  answer: string;
} | null;

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = ArrayLike<SpeechRecognitionAlternativeLike> & {
  isFinal?: boolean;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const TIMER_SECONDS = 10;
const DRILL_REPEAT_COUNT = 10;
const MASTERY_STORAGE_KEY = "constlingo-mastery-v2";
const VOICE_STORAGE_PREFIX = "constlingo-voice-v1";
const SESSION_RESULT_KEY = "constlingo-last-result-v1";
const RETRY_QUESTIONS_KEY = "constlingo-retry-questions-v1";

const PLAN_DETAILS: Record<
  QuestionPlan,
  { label: string; shortLabel: string; description: string; number: string }
> = {
  mixed: {
    label: "ミックス",
    shortLabel: "西→日 + 日→西",
    description: "意味を選ぶ問題と、思い出して発音する問題を半分ずつ。",
    number: "01",
  },
  productive: {
    label: "思い出して発音",
    shortLabel: "日→西 発音",
    description: "日本語を見て、対応するスペイン語を声に出します。",
    number: "02",
  },
  receptive: {
    label: "見て意味を選ぶ",
    shortLabel: "西→日 四択",
    description: "スペイン語を見て、日本語の意味を4つから選びます。",
    number: "03",
  },
  drill: {
    label: "発音反復",
    shortLabel: "聞く + 10回発音",
    description: "音声を聞いたあと、同じ単語を10回ずつ声に出します。",
    number: "04",
  },
};

const QUESTION_SELECTION_DETAILS: Record<
  QuestionSelectionMethod,
  { label: string; description: string }
> = {
  interval: { label: "番号で指定", description: "開始と終了を選ぶ" },
  random: { label: "ランダム", description: "指定した問題数を抽出" },
  "low-mastery": { label: "定着度が低い順", description: "つまずいた語を優先" },
};

const DEFAULT_QUESTION_SELECTION: QuestionSelectionSettings = {
  method: "random",
  start: 1,
  end: DEFAULT_QUESTION_COUNT,
  count: DEFAULT_QUESTION_COUNT,
};

const KIND_LABELS: Record<QuestionKind, string> = {
  receptive: "見て意味を選ぶ",
  productive: "思い出して発音",
  drill: "発音反復",
};

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

function getPreferredVoice(course: Course, voices: SpeechSynthesisVoice[]) {
  const language = course.speechLocale.split("-")[0].toLocaleLowerCase();
  const matchingVoices = voices.filter((voice) =>
    voice.lang.toLocaleLowerCase().startsWith(language),
  );
  for (const preferredName of course.preferredVoiceNames) {
    const match = matchingVoices.find((voice) => voice.name === preferredName);
    if (match) {
      return match;
    }
  }
  return (
    [...matchingVoices].sort((left, right) => {
      const score = (voice: SpeechSynthesisVoice) =>
        (voice.lang.toLocaleLowerCase() === course.speechLocale.toLocaleLowerCase() ? 40 : 0) +
        (voice.name.toLocaleLowerCase().includes("google") ? 20 : 0) +
        (voice.localService ? 5 : 0);
      return score(right) - score(left);
    })[0] ?? null
  );
}

function getChoices(item: VocabularyItem, pool: VocabularyItem[]) {
  const usedMeanings = new Set([item.meaning]);
  const distractors: VocabularyItem[] = [];
  for (const candidate of shuffle(pool.filter((word) => word.id !== item.id))) {
    if (usedMeanings.has(candidate.meaning)) {
      continue;
    }
    usedMeanings.add(candidate.meaning);
    distractors.push(candidate);
    if (distractors.length === 3) {
      break;
    }
  }
  return shuffle([item, ...distractors]);
}

function getRecognitionAlternatives(result: SpeechRecognitionResultLike | undefined) {
  if (!result) {
    return [];
  }
  return Array.from(result)
    .map((alternative) => alternative.transcript?.trim() ?? "")
    .filter(Boolean);
}

function findAcceptedAlternative(
  alternatives: string[],
  item: VocabularyItem,
  locale: string,
) {
  return alternatives.find((transcript) =>
    isAcceptedPronunciation(transcript, item.acceptedSpokenForms, locale),
  );
}

function getRecognitionDecision(
  alternatives: string[],
  item: VocabularyItem,
  locale: string,
) {
  const leadingTranscript = alternatives[0] ?? "";
  if (!leadingTranscript) {
    return null;
  }
  const acceptedTranscript = findAcceptedAlternative(alternatives, item, locale);
  return {
    accepted: Boolean(acceptedTranscript),
    transcript: acceptedTranscript ?? leadingTranscript,
  };
}

function getRouteHref(
  pathname: "/practice" | "/session",
  selection: Selection,
  plan?: QuestionPlan,
  questionSelection?: QuestionSelectionSettings,
  showDrillSpelling = true,
) {
  const params = new URLSearchParams({ kind: selection.kind, id: selection.id });
  if (plan) {
    params.set("plan", plan);
  }
  if (questionSelection) {
    params.set("pick", questionSelection.method);
    params.set("start", String(questionSelection.start));
    params.set("end", String(questionSelection.end));
    params.set("count", String(questionSelection.count));
  }
  if (!showDrillSpelling) {
    params.set("spell", "hide");
  }
  return `${pathname}?${params.toString()}`;
}

function makeQuestion(
  item: VocabularyItem,
  kind: QuestionKind,
  index: number,
  pool: VocabularyItem[],
) {
  return {
    id: `${kind}:${item.id}:${index}:${Date.now()}`,
    kind,
    item,
    choices: kind === "receptive" ? getChoices(item, pool) : undefined,
    attempts: 0,
    firstAttemptCorrect: null,
    firstResponse: "",
    completed: false,
    skipped: false,
    lastRecognized: "",
  } satisfies Question;
}

function buildQuestions(
  selected: VocabularyItem[],
  plan: QuestionPlan,
  pool: VocabularyItem[],
) {
  if (plan === "mixed") {
    const midpoint = Math.ceil(selected.length / 2);
    return shuffle(
      selected.map((item, index) =>
        makeQuestion(item, index < midpoint ? "receptive" : "productive", index, pool),
      ),
    );
  }
  const kind: QuestionKind = plan;
  return shuffle(selected).map((item, index) => makeQuestion(item, kind, index, pool));
}

function describeQuestionSelection(settings: QuestionSelectionSettings) {
  if (settings.method === "interval") {
    return `${settings.start}〜${settings.end}番`;
  }
  if (settings.method === "low-mastery") {
    return `定着度が低い ${settings.count}問`;
  }
  return `ランダム ${settings.count}問`;
}

function sanitizeMastery(value: unknown): MasteryStore {
  if (!value || typeof value !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }
      const record = entry as { receptive?: unknown; productive?: unknown };
      const outcomes = (candidate: unknown) =>
        Array.isArray(candidate)
          ? candidate.filter((item): item is boolean => typeof item === "boolean").slice(-5)
          : [];
      return [[key, { receptive: outcomes(record.receptive), productive: outcomes(record.productive) }]];
    }),
  );
}

function ArrowLeftIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect height="11" rx="5" width="7" x="8.5" y="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M11 6 7 9H3v6h4l4 3V6Z" />
      <path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true">ñ</span>
      <span>Constlingo</span>
    </div>
  );
}

export default function LearningApp({
  course,
  screen = "library",
  initialSelection = { kind: "all", id: "all", label: "全範囲" },
  initialPlan = "mixed",
  initialQuestionSelection = DEFAULT_QUESTION_SELECTION,
  initialShowDrillSpelling = true,
}: {
  course: Course;
  screen?: AppScreen;
  initialSelection?: Selection;
  initialPlan?: QuestionPlan;
  initialQuestionSelection?: QuestionSelectionSettings;
  initialShowDrillSpelling?: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<QuestionPlan>(initialPlan);
  const [questionSelection, setQuestionSelection] = useState<QuestionSelectionSettings>(
    initialQuestionSelection,
  );
  const [showDrillSpelling, setShowDrillSpelling] = useState(initialShowDrillSpelling);
  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [mode, setMode] = useState<StudyMode | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [heard, setHeard] = useState("");
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>("idle");
  const [playbackPurpose, setPlaybackPurpose] = useState<PlaybackPurpose | null>(null);
  const [drillPhase, setDrillPhase] = useState<DrillPhase>("model");
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [drillRepeatCount, setDrillRepeatCount] = useState(0);
  const [mastery, setMastery] = useState<MasteryStore>({});
  const [masteryLoaded, setMasteryLoaded] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const feedbackSpeechTimerRef = useRef<number | null>(null);
  const playbackFallbackTimerRef = useRef<number | null>(null);
  const playbackGenerationRef = useRef(0);
  const questionGenerationRef = useRef(0);
  const questionsRef = useRef<Question[]>([]);
  const showDrillSpellingRef = useRef(showDrillSpelling);

  const currentQuestion = questions[questionIndex];
  const selectedVoice = useMemo(
    () => voices.find((voice) => voice.voiceURI === voiceURI) ?? getPreferredVoice(course, voices),
    [course, voiceURI, voices],
  );

  const rangeItems = useMemo(() => {
    if (selection.kind === "all") {
      return course.items;
    }
    if (selection.kind === "category") {
      return course.items.filter((item) => item.categoryId === selection.id);
    }
    const part = course.parts.find((candidate) => candidate.id === selection.id);
    return course.items.filter((item) => part?.categoryIds.includes(item.categoryId));
  }, [course, selection]);

  const boundedQuestionSelection = useMemo<QuestionSelectionSettings>(() => {
    const max = Math.max(rangeItems.length, 1);
    const start = Math.min(Math.max(questionSelection.start, 1), max);
    const end = Math.min(Math.max(questionSelection.end, start), max);
    const count = Math.min(Math.max(questionSelection.count, 1), max);
    return { ...questionSelection, start, end, count };
  }, [questionSelection, rangeItems.length]);
  const selectedQuestionCount = boundedQuestionSelection.method === "interval"
    ? boundedQuestionSelection.end - boundedQuestionSelection.start + 1
    : boundedQuestionSelection.count;

  const courseMasteryCount = useMemo(
    () => Object.keys(mastery).filter((key) => key.startsWith(`${course.id}:`)).length,
    [course.id, mastery],
  );

  const firstAttemptQuestions = questions.filter(
    (question) => question.kind !== "drill" && question.firstAttemptCorrect !== null,
  );
  const firstTryCorrect = firstAttemptQuestions.filter(
    (question) => question.firstAttemptCorrect,
  ).length;
  const mistakeQuestions = questions.filter(
    (question) => question.firstAttemptCorrect === false,
  );
  const skippedQuestions = questions.filter((question) => question.skipped);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    showDrillSpellingRef.current = showDrillSpelling;
  }, [showDrillSpelling]);

  useEffect(() => {
    const loader = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(MASTERY_STORAGE_KEY);
        setMastery(stored ? sanitizeMastery(JSON.parse(stored)) : {});
      } catch {
        setMastery({});
      } finally {
        setMasteryLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(loader);
  }, []);

  useEffect(() => {
    if (masteryLoaded) {
      window.localStorage.setItem(MASTERY_STORAGE_KEY, JSON.stringify(mastery));
    }
  }, [mastery, masteryLoaded]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }
    const voiceStorageKey = `${VOICE_STORAGE_PREFIX}:${course.id}`;
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      setVoiceURI((current) => {
        const stored = window.localStorage.getItem(voiceStorageKey) ?? "";
        if (current && available.some((voice) => voice.voiceURI === current)) {
          return current;
        }
        if (stored && available.some((voice) => voice.voiceURI === stored)) {
          return stored;
        }
        return getPreferredVoice(course, available)?.voiceURI ?? "";
      });
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [course]);

  useEffect(() => {
    if (voiceURI) {
      window.localStorage.setItem(`${VOICE_STORAGE_PREFIX}:${course.id}`, voiceURI);
    }
  }, [course.id, voiceURI]);

  const stopPlayback = useCallback(() => {
    playbackGenerationRef.current += 1;
    if (playbackFallbackTimerRef.current !== null) {
      window.clearTimeout(playbackFallbackTimerRef.current);
      playbackFallbackTimerRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setPlaybackPurpose(null);
  }, []);

  const playSpeech = useCallback(
    (text: string, purpose: PlaybackPurpose, onEnd?: () => void) => {
      const requestGeneration = playbackGenerationRef.current + 1;
      playbackGenerationRef.current = requestGeneration;
      if (playbackFallbackTimerRef.current !== null) {
        window.clearTimeout(playbackFallbackTimerRef.current);
        playbackFallbackTimerRef.current = null;
      }

      if (!("speechSynthesis" in window)) {
        setPlaybackPurpose(null);
        onEnd?.();
        return;
      }

      window.speechSynthesis.cancel();
      setPlaybackPurpose(purpose);
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = selectedVoiceRef.current;
      utterance.lang = voice?.lang ?? course.speechLocale;
      utterance.voice = voice;
      utterance.rate = 0.92;
      utterance.pitch = 1;

      let completed = false;
      const complete = () => {
        if (completed || playbackGenerationRef.current !== requestGeneration) {
          return;
        }
        completed = true;
        if (playbackFallbackTimerRef.current !== null) {
          window.clearTimeout(playbackFallbackTimerRef.current);
          playbackFallbackTimerRef.current = null;
        }
        setPlaybackPurpose(null);
        onEnd?.();
      };
      utterance.onend = complete;
      utterance.onerror = complete;
      playbackFallbackTimerRef.current = window.setTimeout(
        complete,
        Math.min(Math.max(text.length * 280, 2200), 5200),
      );
      window.speechSynthesis.speak(utterance);
    },
    [course.speechLocale],
  );

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    if (feedbackSpeechTimerRef.current !== null) {
      window.clearTimeout(feedbackSpeechTimerRef.current);
      feedbackSpeechTimerRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    const current = recognitionRef.current;
    recognitionRef.current = null;
    current?.abort();
  }, []);

  const resetQuestionUi = useCallback(() => {
    questionGenerationRef.current += 1;
    clearFeedbackTimer();
    stopRecognition();
    stopPlayback();
    setAnswered(false);
    setFeedback(null);
    setSelectedChoiceId(null);
    setHeard("");
    setRecognitionStatus("idle");
    setDrillPhase("model");
    setTimeLeft(TIMER_SECONDS);
    setDrillRepeatCount(0);
  }, [clearFeedbackTimer, stopPlayback, stopRecognition]);

  useEffect(
    () => () => {
      clearFeedbackTimer();
      stopRecognition();
      stopPlayback();
    },
    [clearFeedbackTimer, stopPlayback, stopRecognition],
  );

  const finishSession = useCallback(() => {
    window.sessionStorage.setItem(
      SESSION_RESULT_KEY,
      JSON.stringify({
        questions: questionsRef.current,
        mode: {
          plan,
          questionSelection: boundedQuestionSelection,
          showDrillSpelling: showDrillSpellingRef.current,
        },
        selection,
      }),
    );
    router.replace("/result");
  }, [boundedQuestionSelection, plan, router, selection]);

  const advanceQuestion = useCallback(() => {
    resetQuestionUi();
    if (questionIndex + 1 >= questions.length) {
      finishSession();
      return;
    }
    setQuestionIndex((index) => index + 1);
  }, [finishSession, questionIndex, questions.length, resetQuestionUi]);

  const finishAttempt = useCallback(
    (correct: boolean, recognized = "") => {
      if (!currentQuestion || answered || currentQuestion.kind === "drill") {
        return;
      }
      const scoredKind = currentQuestion.kind;
      const isFirstAttempt = currentQuestion.attempts === 0;
      const questionGeneration = questionGenerationRef.current;
      stopRecognition();
      setAnswered(true);
      setRecognitionStatus(correct ? "correct" : "miss");
      setFeedback({ status: correct ? "correct" : "miss", answer: currentQuestion.item.spokenForm });
      if (recognized) {
        setHeard(recognized);
      }

      setQuestions((current) =>
        current.map((question, index) =>
          index === questionIndex
            ? {
                ...question,
                attempts: question.attempts + 1,
                firstAttemptCorrect:
                  question.firstAttemptCorrect ?? correct,
                firstResponse: question.attempts === 0 ? recognized : question.firstResponse,
                completed: correct,
                lastRecognized: recognized || question.lastRecognized,
              }
            : question,
        ),
      );

      if (isFirstAttempt) {
        setMastery((current) =>
          appendMasteryOutcome(
            current,
            course.id,
            currentQuestion.item.id,
            scoredKind,
            correct,
          ),
        );
      }

      let minimumDisplayDone = false;
      let speechDone = false;
      let continued = false;
      const continueWhenReady = () => {
        if (
          continued ||
          questionGenerationRef.current !== questionGeneration ||
          !minimumDisplayDone ||
          !speechDone
        ) {
          return;
        }
        continued = true;
        if (correct) {
          advanceQuestion();
        } else {
          stopPlayback();
          setAnswered(false);
          setFeedback(null);
          setSelectedChoiceId(null);
          setRecognitionStatus("idle");
          setHeard("");
          setTimeLeft(TIMER_SECONDS);
        }
      };
      feedbackTimerRef.current = window.setTimeout(() => {
        minimumDisplayDone = true;
        feedbackTimerRef.current = null;
        continueWhenReady();
      }, correct ? 850 : 1350);
      feedbackSpeechTimerRef.current = window.setTimeout(() => {
        feedbackSpeechTimerRef.current = null;
        speechDone = true;
        continueWhenReady();
      }, Math.min(Math.max(currentQuestion.item.spokenForm.length * 320, 2400), 5400));
      playSpeech(
        currentQuestion.item.spokenForm,
        "feedback",
        () => {
          if (feedbackSpeechTimerRef.current !== null) {
            window.clearTimeout(feedbackSpeechTimerRef.current);
            feedbackSpeechTimerRef.current = null;
          }
          speechDone = true;
          continueWhenReady();
        },
      );
    },
    [advanceQuestion, answered, course.id, currentQuestion, playSpeech, questionIndex, stopPlayback, stopRecognition],
  );

  const startRecognition = useCallback(() => {
    if (!currentQuestion || answered || currentQuestion.kind !== "productive") {
      return;
    }
    if (recognitionRef.current) {
      return;
    }
    stopRecognition();
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setRecognitionStatus("unsupported");
      return;
    }
    const recognition = new Recognition();
    let latestAlternatives: string[] = [];
    let settled = false;
    recognition.lang = course.speechLocale;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;
    setHeard("");
    setRecognitionStatus("listening");

    const finishFromLatestRecognition = () => {
      if (settled) {
        return true;
      }
      const decision = getRecognitionDecision(
        latestAlternatives,
        currentQuestion.item,
        course.targetLocale,
      );
      if (!decision) {
        return false;
      }
      settled = true;
      finishAttempt(decision.accepted, decision.transcript);
      return true;
    };

    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) {
        return;
      }
      const result = event.results[event.results.length - 1];
      latestAlternatives = getRecognitionAlternatives(result);
      const leadingTranscript = latestAlternatives[0] ?? "";
      setHeard(leadingTranscript);
      const decision = getRecognitionDecision(
        latestAlternatives,
        currentQuestion.item,
        course.targetLocale,
      );
      if (decision?.accepted || result?.isFinal) {
        finishFromLatestRecognition();
      }
    };
    recognition.onerror = () => {
      if (recognitionRef.current === recognition) {
        if (!finishFromLatestRecognition()) {
          recognitionRef.current = null;
          setRecognitionStatus("no-match");
        }
      }
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        if (!finishFromLatestRecognition()) {
          recognitionRef.current = null;
          setRecognitionStatus("no-match");
        }
      }
    };
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setRecognitionStatus("no-match");
    }
  }, [answered, course.speechLocale, course.targetLocale, currentQuestion, finishAttempt, stopRecognition]);

  useEffect(() => {
    if (
      screen !== "session" ||
      !currentQuestion ||
      currentQuestion.kind !== "productive" ||
      answered
    ) {
      return;
    }
    if (currentQuestion.attempts >= 10) {
      return;
    }

    const preparing = window.setTimeout(() => setRecognitionStatus("preparing"), 0);
    const starter = window.setTimeout(startRecognition, 380);
    return () => {
      window.clearTimeout(preparing);
      window.clearTimeout(starter);
    };
  }, [answered, currentQuestion, screen, startRecognition]);

  useEffect(() => {
    if (screen !== "session" || !currentQuestion || currentQuestion.kind !== "receptive" || answered) {
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const remaining = Math.max(TIMER_SECONDS - (Date.now() - startedAt) / 1000, 0);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        window.clearInterval(timer);
        finishAttempt(false, "時間切れ");
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [answered, currentQuestion, finishAttempt, screen]);

  useEffect(() => {
    if (screen !== "session" || !currentQuestion || currentQuestion.kind !== "drill") {
      return;
    }
    let cancelled = false;
    let recognition: SpeechRecognitionLike | null = null;
    let pauseTimer: number | null = null;
    let recognitionTimer: number | null = null;
    let completedRepeats = 0;

    const finishQuestion = () => {
      setDrillPhase("complete");
      setFeedback({ status: "correct", answer: currentQuestion.item.spokenForm });
      pauseTimer = window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        setQuestions((current) =>
          {
            const next = current.map((question, index) =>
            index === questionIndex ? { ...question, completed: true } : question,
            );
            questionsRef.current = next;
            return next;
          },
        );
        advanceQuestion();
      }, 650);
    };

    const completeRound = (status: RecognitionStatus, transcript = "") => {
      if (cancelled) {
        return;
      }
      if (recognitionTimer !== null) {
        window.clearTimeout(recognitionTimer);
        recognitionTimer = null;
      }
      recognitionRef.current = null;
      recognition?.abort();
      recognition = null;
      completedRepeats += 1;
      setDrillRepeatCount(completedRepeats);
      setRecognitionStatus(status);
      setDrillPhase(status === "unsupported" ? "unsupported" : "result");
      setHeard(transcript);
      if (completedRepeats >= DRILL_REPEAT_COUNT) {
        finishQuestion();
        return;
      }
      pauseTimer = window.setTimeout(runRound, 800);
    };

    const beginListening = () => {
      if (cancelled) {
        return;
      }
      setDrillPhase("listening");
      const Recognition = getSpeechRecognition();
      if (!Recognition) {
        setRecognitionStatus("unsupported");
        setDrillPhase("unsupported");
        recognitionTimer = window.setTimeout(() => completeRound("unsupported"), 1700);
        return;
      }
      const activeRecognition = new Recognition();
      recognition = activeRecognition;
      activeRecognition.lang = course.speechLocale;
      activeRecognition.interimResults = true;
      activeRecognition.maxAlternatives = 3;
      recognitionRef.current = activeRecognition;
      let latestAlternatives: string[] = [];
      setRecognitionStatus("listening");
      setHeard("");
      let roundFinished = false;
      const finishOnce = (status: RecognitionStatus, transcript = "") => {
        if (roundFinished) {
          return;
        }
        roundFinished = true;
        completeRound(status, transcript);
      };
      const finishFromLatestRecognition = () => {
        if (cancelled || recognitionRef.current !== activeRecognition) {
          return;
        }
        const decision = getRecognitionDecision(
          latestAlternatives,
          currentQuestion.item,
          course.targetLocale,
        );
        finishOnce(
          decision ? (decision.accepted ? "correct" : "miss") : "no-match",
          decision?.transcript ?? "",
        );
      };
      activeRecognition.onresult = (event) => {
        if (cancelled || recognitionRef.current !== activeRecognition) {
          return;
        }
        const result = event.results[event.results.length - 1];
        latestAlternatives = getRecognitionAlternatives(result);
        const leadingTranscript = latestAlternatives[0] ?? "";
        setHeard(leadingTranscript);
        const decision = getRecognitionDecision(
          latestAlternatives,
          currentQuestion.item,
          course.targetLocale,
        );
        if (decision?.accepted || result?.isFinal) {
          finishFromLatestRecognition();
        }
      };
      activeRecognition.onerror = finishFromLatestRecognition;
      activeRecognition.onend = finishFromLatestRecognition;
      recognitionTimer = window.setTimeout(finishFromLatestRecognition, 4500);
      try {
        activeRecognition.start();
      } catch {
        finishOnce("no-match");
      }
    };

    function runRound() {
      if (cancelled) {
        return;
      }
      setDrillPhase("model");
      setRecognitionStatus("idle");
      setHeard("");
      playSpeech(
        currentQuestion.item.spokenForm,
        "drill-model",
        beginListening,
      );
    }

    runRound();
    return () => {
      cancelled = true;
      if (pauseTimer !== null) {
        window.clearTimeout(pauseTimer);
      }
      if (recognitionTimer !== null) {
        window.clearTimeout(recognitionTimer);
      }
      recognitionRef.current = null;
      recognition?.abort();
      stopPlayback();
    };
  }, [advanceQuestion, course.speechLocale, course.targetLocale, currentQuestion, playSpeech, questionIndex, screen, stopPlayback]);

  const selectChoice = (choice: VocabularyItem) => {
    if (!currentQuestion || answered) {
      return;
    }
    setSelectedChoiceId(choice.id);
    finishAttempt(choice.id === currentQuestion.item.id, choice.meaning);
  };

  const beginSession = useCallback(
    (retry?: Question[]) => {
      let nextQuestions: Question[];
      if (retry) {
        nextQuestions = shuffle(retry).map((question, index) =>
          makeQuestion(question.item, question.kind, index, rangeItems),
        );
      } else {
        const practicePool = getPracticePool(
          rangeItems,
          boundedQuestionSelection.method,
          plan,
          mastery,
          course.id,
        );
        const selectedItems = boundedQuestionSelection.method === "interval"
          ? practicePool.slice(
            boundedQuestionSelection.start - 1,
            boundedQuestionSelection.end,
          )
          : practicePool.slice(0, boundedQuestionSelection.count);
        nextQuestions = buildQuestions(selectedItems, plan, rangeItems);
      }

      setMode({ plan, questionSelection: boundedQuestionSelection, showDrillSpelling });
      setQuestions(nextQuestions);
      questionsRef.current = nextQuestions;
      setQuestionIndex(0);
      setSettingsOpen(false);
      resetQuestionUi();
    },
    [
      boundedQuestionSelection,
      course.id,
      mastery,
      plan,
      rangeItems,
      resetQuestionUi,
      showDrillSpelling,
    ],
  );

  useEffect(() => {
    if (screen !== "session" || !masteryLoaded || questions.length > 0) {
      return;
    }
    const starter = window.setTimeout(() => {
      let retry: Question[] | undefined;
      try {
        const storedRetry = window.sessionStorage.getItem(RETRY_QUESTIONS_KEY);
        retry = storedRetry ? JSON.parse(storedRetry) as Question[] : undefined;
      } catch {
        retry = undefined;
      }
      window.sessionStorage.removeItem(RETRY_QUESTIONS_KEY);
      beginSession(retry);
    }, 0);
    return () => window.clearTimeout(starter);
  }, [beginSession, masteryLoaded, questions.length, screen]);

  useEffect(() => {
    if (screen !== "result") {
      return;
    }
    const loader = window.setTimeout(() => {
      try {
        const stored = window.sessionStorage.getItem(SESSION_RESULT_KEY);
        if (!stored) {
          router.replace("/");
          return;
        }
        const result = JSON.parse(stored) as {
          questions: Question[];
          mode: Partial<StudyMode> & { order?: string };
          selection: Selection;
        };
        const resultPlan = result.mode.plan && Object.hasOwn(PLAN_DETAILS, result.mode.plan)
          ? result.mode.plan
          : "mixed";
        const fallbackCount = Math.max(result.questions.length, 1);
        const resultMode: StudyMode = {
          plan: resultPlan,
          questionSelection: result.mode.questionSelection ?? {
            method: result.mode.order === "low-mastery" ? "low-mastery" : "random",
            start: 1,
            end: fallbackCount,
            count: fallbackCount,
          },
          showDrillSpelling: result.mode.showDrillSpelling ?? true,
        };
        setQuestions(result.questions);
        questionsRef.current = result.questions;
        setMode(resultMode);
        setPlan(resultMode.plan);
        setQuestionSelection(resultMode.questionSelection);
        setShowDrillSpelling(resultMode.showDrillSpelling);
        setSelection(result.selection);
      } catch {
        router.replace("/");
      }
    }, 0);
    return () => window.clearTimeout(loader);
  }, [router, screen]);

  const leaveSession = () => {
    if (window.confirm("今回の演習を終了しますか？")) {
      resetQuestionUi();
      router.push(getRouteHref(
        "/practice",
        selection,
        plan,
        boundedQuestionSelection,
        showDrillSpelling,
      ));
    }
  };

  const openRange = (
    nextSelection: Selection,
    nextMethod: QuestionSelectionMethod = "random",
  ) => {
    setSettingsOpen(false);
    router.push(getRouteHref(
      "/practice",
      nextSelection,
      undefined,
      { ...DEFAULT_QUESTION_SELECTION, method: nextMethod },
    ));
  };

  const startSession = () => {
    router.push(getRouteHref(
      "/session",
      selection,
      plan,
      boundedQuestionSelection,
      showDrillSpelling,
    ));
  };

  const retryMistakes = () => {
    window.sessionStorage.setItem(RETRY_QUESTIONS_KEY, JSON.stringify(mistakeQuestions));
    startSession();
  };

  const skipQuestion = () => {
    if (!currentQuestion || answered) {
      return;
    }
    setQuestions((current) => {
      const next = current.map((question, index) =>
        index === questionIndex ? { ...question, skipped: true } : question,
      );
      questionsRef.current = next;
      return next;
    });
    advanceQuestion();
  };

  const goLibrary = () => {
    resetQuestionUi();
    setSettingsOpen(false);
    router.push("/");
  };

  const goSetup = () => {
    resetQuestionUi();
    setSettingsOpen(false);
    router.push(getRouteHref(
      "/practice",
      selection,
      plan,
      boundedQuestionSelection,
      showDrillSpelling,
    ));
  };

  const voiceOptions = voices.filter((voice) =>
    voice.lang.toLocaleLowerCase().startsWith(course.speechLocale.split("-")[0].toLocaleLowerCase()),
  );

  const header = (
    <header className="app-header">
      <Brand />
      <div className="header-actions">
        <span className="course-chip">
          <span aria-hidden="true">{course.targetLocale.split("-")[0].toUpperCase()}</span>
          {course.title}
        </span>
        <button
          className="icon-control"
          type="button"
          aria-label="音声設定"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <SettingsIcon />
        </button>
      </div>
      {settingsOpen && (
        <div className="settings-popover">
          <div>
            <span className="eyebrow">Voice</span>
            <strong>読み上げ音声</strong>
          </div>
          <select value={voiceURI} onChange={(event) => setVoiceURI(event.target.value)}>
            {voiceOptions.length === 0 && <option value="">ブラウザの標準音声</option>}
            {voiceOptions.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} — {voice.lang}
              </option>
            ))}
          </select>
          <p>このコースではGoogleのスペイン語音声を優先します。</p>
        </div>
      )}
    </header>
  );

  return (
    <main className="app-shell">
      {screen !== "session" && header}

      {screen === "library" && (
        <div className="page-frame library-page">
          <section className="library-header">
            <div className="library-heading">
              <span className="eyebrow">Vocabulary</span>
              <h1>学ぶ範囲</h1>
              <p>語彙全体、カテゴリー、パートから対象を選びます。</p>
            </div>
            <div className="library-meta" aria-label={`${course.items.length}語を収録`}>
              <strong>{course.items.length.toLocaleString()}語</strong>
              <span>{course.categories.length}カテゴリー</span>
              <span>{course.parts.length}パート</span>
            </div>
          </section>

          <section className="library-collections" aria-labelledby="collection-heading">
            <div className="collection-block">
              <div className="collection-block-heading">
                <h3 id="collection-heading">カテゴリー別</h3>
                <span>{course.categories.length}カテゴリー</span>
              </div>
              <div className="category-list">
                {course.categories.map((category, index) => {
                  const count = course.items.filter((item) => item.categoryId === category.id).length;
                  return (
                    <button
                      className="category-row"
                      key={category.id}
                      type="button"
                      onClick={() => openRange({ kind: "category", id: category.id, label: category.label })}
                    >
                      <span className="category-index">{String(index + 1).padStart(2, "0")}</span>
                      <strong>{category.label}</strong>
                      <small>{count}語</small>
                      <span className="row-check"><ArrowRightIcon /></span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="collection-block part-collection-block">
              <div className="collection-block-heading">
                <h3>パート別</h3>
                <span>{course.parts.length}パート</span>
              </div>
              <div className="part-list">
                {course.parts.map((part, index) => {
                  const count = course.items.filter((item) => part.categoryIds.includes(item.categoryId)).length;
                  return (
                    <button
                      className="part-row"
                      key={part.id}
                      type="button"
                      onClick={() => openRange({ kind: "part", id: part.id, label: part.label })}
                    >
                      <span className="part-index">0{index + 1}</span>
                      <span><strong>{part.label}</strong><small>{part.description}</small></span>
                      <span className="part-count">{count}語</span>
                      <span className="row-check"><ArrowRightIcon /></span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="secondary-ranges">
              <div className="collection-block-heading">
                <h3>その他の範囲</h3>
              </div>
              <div className="utility-range-list">
                <button
                  className="utility-range-row"
                  type="button"
                  onClick={() => openRange({ kind: "all", id: "all", label: "全範囲" })}
                >
                  <span aria-hidden="true">∞</span>
                  <span><strong>全範囲</strong><small>{course.datasetLabel}を横断</small></span>
                  <ArrowRightIcon />
                </button>
                <button
                  className="utility-range-row"
                  type="button"
                  onClick={() => openRange(
                    { kind: "all", id: "all", label: "全範囲" },
                    "low-mastery",
                  )}
                >
                  <span aria-hidden="true">↗</span>
                  <span>
                    <strong>定着度が低い語</strong>
                    <small>{courseMasteryCount === 0 ? "練習後に利用" : "定着度から自動選択"}</small>
                  </span>
                  <ArrowRightIcon />
                </button>
              </div>
            </div>
          </section>

          <footer className="app-footer">
            <span>{course.datasetLabel}</span>
            <span>定着度のみを端末に保存</span>
            <span>Chromeでの音声認識を推奨</span>
          </footer>
        </div>
      )}

      {screen === "setup" && (
        <div className="page-frame setup-page">
          <button className="back-button" type="button" onClick={goLibrary}>
            <ArrowLeftIcon />
            学ぶ範囲を選び直す
          </button>

          <section className="setup-object-header">
            <div>
              <span className="eyebrow">
                {selection.id === "low-mastery"
                  ? "Smart collection"
                  : selection.kind === "category"
                    ? "Category"
                    : selection.kind === "part"
                      ? "Part"
                      : "Collection"}
              </span>
              <h1>{selection.label}</h1>
              <p>
                {selection.id === "low-mastery"
                  ? "定着度の記録から、優先する語を毎回自動で選びます。"
                  : `${rangeItems.length}語のコレクションに、練習方法を選んで適用します。`}
              </p>
            </div>
            <span className="setup-object-mark" aria-hidden="true">
              {selection.id === "low-mastery"
                ? "↗"
                : selection.kind === "category"
                  ? "C"
                  : selection.kind === "part"
                    ? "P"
                    : "∞"}
            </span>
          </section>

          <div className="setup-layout">
            <section className="setup-main" aria-labelledby="practice-heading">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Action</span>
                  <h2 id="practice-heading">どう練習しますか？</h2>
                </div>
                <p>選んだ範囲はそのままに、練習方法だけを切り替えられます。</p>
              </div>

              <div className="plan-grid">
                {(Object.keys(PLAN_DETAILS) as QuestionPlan[]).map((option) => {
                  const detail = PLAN_DETAILS[option];
                  const selected = plan === option;
                  return (
                    <button
                      className={`plan-card ${selected ? "is-selected" : ""}`}
                      key={option}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setPlan(option)}
                    >
                      <span className="plan-number">{detail.number}</span>
                      <span className="plan-content">
                        <strong>{detail.label}</strong>
                        <small>{detail.shortLabel}</small>
                        <span>{detail.description}</span>
                      </span>
                      <span className="plan-check" aria-hidden="true"><CheckIcon /></span>
                    </button>
                  );
                })}
              </div>

              <section className="question-set-section" aria-labelledby="question-set-heading">
                <div className="section-heading compact-heading">
                  <div>
                    <span className="eyebrow">Questions</span>
                    <h2 id="question-set-heading">どの問題を使いますか？</h2>
                  </div>
                  <p>対象を選んだあと、出題順は毎回ランダムにします。</p>
                </div>

                <div className="question-set-methods">
                  {(Object.keys(QUESTION_SELECTION_DETAILS) as QuestionSelectionMethod[]).map((method) => {
                    const detail = QUESTION_SELECTION_DETAILS[method];
                    const selected = boundedQuestionSelection.method === method;
                    return (
                      <button
                        className={`question-set-method ${selected ? "is-selected" : ""}`}
                        key={method}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setQuestionSelection((current) => ({ ...current, method }))}
                      >
                        <span className="method-radio" aria-hidden="true" />
                        <span><strong>{detail.label}</strong><small>{detail.description}</small></span>
                      </button>
                    );
                  })}
                </div>

                {boundedQuestionSelection.method === "interval" ? (
                  <div className="question-number-control">
                    <label className="number-field">
                      <span>開始</span>
                      <span className="number-input-wrap">
                        <input
                          aria-label="開始番号"
                          inputMode="numeric"
                          max={rangeItems.length}
                          min="1"
                          type="number"
                          value={boundedQuestionSelection.start}
                          onChange={(event) => {
                            const value = Math.min(
                              Math.max(Number.parseInt(event.target.value, 10) || 1, 1),
                              Math.max(rangeItems.length, 1),
                            );
                            setQuestionSelection((current) => ({
                              ...current,
                              start: value,
                              end: Math.max(current.end, value),
                            }));
                          }}
                        />
                        <small>番</small>
                      </span>
                    </label>
                    <span className="number-range-separator" aria-hidden="true">〜</span>
                    <label className="number-field">
                      <span>終了</span>
                      <span className="number-input-wrap">
                        <input
                          aria-label="終了番号"
                          inputMode="numeric"
                          max={rangeItems.length}
                          min={boundedQuestionSelection.start}
                          type="number"
                          value={boundedQuestionSelection.end}
                          onChange={(event) => {
                            const value = Math.min(
                              Math.max(
                                Number.parseInt(event.target.value, 10) || boundedQuestionSelection.start,
                                boundedQuestionSelection.start,
                              ),
                              Math.max(rangeItems.length, 1),
                            );
                            setQuestionSelection((current) => ({ ...current, end: value }));
                          }}
                        />
                        <small>番</small>
                      </span>
                    </label>
                    <strong className="question-count-preview">{selectedQuestionCount}問</strong>
                  </div>
                ) : (
                  <div className="question-number-control count-control">
                    <label className="number-field">
                      <span>問題数</span>
                      <span className="number-input-wrap">
                        <input
                          aria-label="問題数"
                          inputMode="numeric"
                          max={rangeItems.length}
                          min="1"
                          type="number"
                          value={boundedQuestionSelection.count}
                          onChange={(event) => {
                            const value = Math.min(
                              Math.max(Number.parseInt(event.target.value, 10) || 1, 1),
                              Math.max(rangeItems.length, 1),
                            );
                            setQuestionSelection((current) => ({ ...current, count: value }));
                          }}
                        />
                        <small>問</small>
                      </span>
                    </label>
                    <p>
                      {boundedQuestionSelection.method === "low-mastery"
                        ? "定着度の記録がない語は、同順位としてランダムに選びます。"
                        : `${rangeItems.length}語から重複せずに選びます。`}
                    </p>
                  </div>
                )}

                {plan === "drill" && (
                  <label className="spelling-setting">
                    <span>
                      <strong>スペルを表示</strong>
                      <small>発音反復中にも、いつでも表示を切り替えられます。</small>
                    </span>
                    <input
                      checked={showDrillSpelling}
                      type="checkbox"
                      onChange={(event) => setShowDrillSpelling(event.target.checked)}
                    />
                    <span className="toggle-track" aria-hidden="true"><span /></span>
                  </label>
                )}
              </section>

              <div className="setup-principles">
                <span>問題数は自由に指定</span>
                <span>出題順はランダム</span>
                <span>日付・連続日数は記録しない</span>
                <span>初回回答のみ定着度へ反映</span>
              </div>
            </section>

            <aside className="session-summary setup-summary">
              <span className="eyebrow">Session setup</span>
              <h2>今回の演習</h2>
              <dl>
                <div><dt>範囲</dt><dd>{selection.label}</dd></div>
                <div>
                  <dt>収録</dt>
                  <dd>{rangeItems.length}語</dd>
                </div>
                <div><dt>練習</dt><dd>{PLAN_DETAILS[plan].label}</dd></div>
                <div><dt>対象</dt><dd>{describeQuestionSelection(boundedQuestionSelection)}</dd></div>
                <div><dt>問題数</dt><dd>{selectedQuestionCount}問</dd></div>
                <div><dt>出題順</dt><dd>ランダム</dd></div>
                {plan === "drill" && (
                  <div><dt>スペル</dt><dd>{showDrillSpelling ? "表示" : "非表示"}</dd></div>
                )}
              </dl>

              <button
                className="primary-button summary-start"
                disabled={rangeItems.length < (plan === "receptive" || plan === "mixed" ? 4 : 1)}
                type="button"
                onClick={startSession}
              >
                この方法で始める
                <ArrowRightIcon />
              </button>
              <p className="summary-note">練習後も、この範囲に戻って別の方法を選べます。</p>
            </aside>
          </div>
        </div>
      )}

      {screen === "session" && !currentQuestion && (
        <section className="session-page route-loading-page">
          <Brand compact />
          <div role="status">
            <span className="eyebrow">Preparing session</span>
            <strong>問題を準備しています…</strong>
          </div>
        </section>
      )}

      {screen === "session" && currentQuestion && (
        <section className="session-page">
          <header className="session-header">
            <Brand compact />
            <div className="session-progress-copy">
              <span>{KIND_LABELS[currentQuestion.kind]}</span>
              <strong>{String(questionIndex + 1).padStart(2, "0")} <small>/ {questions.length}</small></strong>
            </div>
            <button className="exit-button" type="button" onClick={leaveSession}>終了</button>
          </header>
          <div className="session-progress-track">
            <div style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} />
          </div>

          <div className="question-stage">
            <div className="question-context">
              <span>{currentQuestion.item.categoryId}</span>
              <div className="question-tools">
                {playbackPurpose && currentQuestion.kind !== "drill" && (
                  <span className="audio-activity" role="status">
                    <VolumeIcon />
                    {playbackPurpose === "feedback" ? "正解音声を再生中" : "音声を再生中"}
                  </span>
                )}
                {currentQuestion.kind === "receptive" && (
                  <span className={`question-timer ${timeLeft <= 3 ? "is-low" : ""}`}>{timeLeft}s</span>
                )}
                {currentQuestion.kind === "drill" && (
                  <button
                    className="spelling-toggle-button"
                    type="button"
                    aria-pressed={showDrillSpelling}
                    onClick={() => setShowDrillSpelling((visible) => !visible)}
                  >
                    {showDrillSpelling ? "スペルを隠す" : "スペルを表示"}
                  </button>
                )}
                <button
                  className="question-skip-button"
                  disabled={answered}
                  type="button"
                  onClick={skipQuestion}
                >
                  スキップ
                  <ArrowRightIcon />
                </button>
              </div>
            </div>

            <div className={`question-card question-${currentQuestion.kind} ${feedback ? `has-${feedback.status}` : ""}`}>
              <span className="question-label">{KIND_LABELS[currentQuestion.kind]}</span>
              {currentQuestion.kind === "receptive" && (
                <>
                  <h1 lang={course.targetLocale}>{currentQuestion.item.spokenForm}</h1>
                  <p>もっとも近い意味を選んでください</p>
                </>
              )}
              {currentQuestion.kind === "productive" && (
                <>
                  <h1>{currentQuestion.item.meaning}</h1>
                  <p>{course.targetLanguageLabel}で発音してください</p>
                </>
              )}
              {currentQuestion.kind === "drill" && (
                <>
                  <h1>{currentQuestion.item.meaning}</h1>
                  <div
                    className={`spoken-word ${playbackPurpose === "drill-model" ? "is-playing" : ""} ${showDrillSpelling ? "" : "is-hidden"}`}
                    lang={course.targetLocale}
                  >
                    <VolumeIcon />
                    {showDrillSpelling
                      ? currentQuestion.item.spokenForm
                      : <span className="hidden-spelling">スペル非表示</span>}
                  </div>
                </>
              )}
            </div>

            {feedback && currentQuestion.kind !== "drill" && (
              <div className={`feedback-strip feedback-${feedback.status}`} role="status">
                <span className="feedback-icon">{feedback.status === "correct" ? <CheckIcon /> : "!"}</span>
                <span>
                  <strong>{feedback.status === "correct" ? "そのとおり" : "もう一度"}</strong>
                  <small>正解：<span lang={course.targetLocale}>{feedback.answer}</span></small>
                </span>
                <button
                  type="button"
                  aria-label="正解を聞く"
                  onClick={() => playSpeech(feedback.answer, "manual")}
                >
                  <VolumeIcon />
                </button>
              </div>
            )}

            {currentQuestion.kind === "receptive" && (
              <div className="choice-list">
                {currentQuestion.choices?.map((choice, index) => (
                  <button
                    className={`choice-button ${selectedChoiceId === choice.id ? "is-selected" : ""}`}
                    disabled={answered}
                    key={choice.id}
                    type="button"
                    onClick={() => selectChoice(choice)}
                  >
                    <span>{String.fromCharCode(65 + index)}</span>
                    <strong>{choice.meaning}</strong>
                  </button>
                ))}
                <button
                  className="dont-know-button"
                  disabled={answered}
                  type="button"
                  onClick={() => finishAttempt(false, "わからない")}
                >
                  わからない
                </button>
              </div>
            )}

            {currentQuestion.kind === "productive" && (
              <div className="speech-control">
                <button
                  className={`mic-button status-${recognitionStatus}`}
                  disabled={answered || recognitionStatus === "preparing" || recognitionStatus === "listening"}
                  type="button"
                  onClick={startRecognition}
                >
                  <MicIcon />
                  <span>
                    {recognitionStatus === "preparing"
                      ? "準備しています"
                      : recognitionStatus === "listening"
                        ? "聞いています"
                        : "発音する"}
                  </span>
                </button>
                <SpeechStatus status={recognitionStatus} heard={heard} />
                <button
                  className="dont-know-button"
                  disabled={answered}
                  type="button"
                  onClick={() => finishAttempt(false, "わからない")}
                >
                  わからない
                </button>
              </div>
            )}

            {currentQuestion.kind === "drill" && (
              <div className="drill-control">
                <DrillPhaseStatus
                  phase={drillPhase}
                  recognitionStatus={recognitionStatus}
                  heard={showDrillSpelling ? heard : ""}
                  showSpelling={showDrillSpelling}
                />
                <div className="drill-meter">
                  <div className="drill-count">
                    <strong>{String(drillRepeatCount).padStart(2, "0")}</strong>
                    <span>/ {DRILL_REPEAT_COUNT}</span>
                  </div>
                  <div className="drill-progress"><div style={{ width: `${(drillRepeatCount / DRILL_REPEAT_COUNT) * 100}%` }} /></div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {screen === "result" && mode && (
        <div className="page-frame result-page">
          <button className="back-button" type="button" onClick={goLibrary}>
            <ArrowLeftIcon />
            学ぶ範囲を選ぶ
          </button>

          <section className="result-hero">
            <span className="eyebrow">Session complete</span>
            {mode.plan === "drill" ? (
              <>
                <h1><em>{questions.filter((question) => question.completed).length}</em>語</h1>
                <p>
                  声に出した分だけ、ことばは自分のものになる。
                  {skippedQuestions.length > 0 ? ` スキップ ${skippedQuestions.length}語。` : ""}
                </p>
              </>
            ) : (
              <>
                <h1><em>{firstTryCorrect}</em><span>/ {firstAttemptQuestions.length}</span></h1>
                <p>
                  {firstAttemptQuestions.length === 0
                    ? "今回は採点した問題がありません。"
                    : mistakeQuestions.length === 0
                      ? "すべて初回で正解しました。"
                      : `初回正解は${firstTryCorrect}問。${mistakeQuestions.length}語をもう一度確認しましょう。`}
                  {skippedQuestions.length > 0 ? ` スキップ ${skippedQuestions.length}問。` : ""}
                </p>
              </>
            )}
            <div className="result-meta">
              <span>{PLAN_DETAILS[mode.plan].label}</span>
              <span>{selection.label}</span>
              <span>{describeQuestionSelection(mode.questionSelection)}</span>
              <span>ランダム順</span>
            </div>
          </section>

          {mistakeQuestions.length > 0 && (
            <section className="review-section">
              <div className="section-heading">
                <div><span className="eyebrow">Review</span><h2>今回つまずいた単語</h2></div>
                <span>{mistakeQuestions.length}語</span>
              </div>
              <div className="review-list">
                {mistakeQuestions.map((question) => (
                  <div className="review-row" key={question.id}>
                    <span className="review-kind">{question.kind === "receptive" ? "西→日" : "日→西"}</span>
                    <span>
                      <strong lang={course.targetLocale}>{question.item.spokenForm}</strong>
                      <small>
                        {question.item.meaning}
                        {question.firstResponse ? ` · 初回回答：${question.firstResponse}` : ""}
                      </small>
                    </span>
                    <button
                      type="button"
                      aria-label={`${question.item.spokenForm}を聞く`}
                      onClick={() => playSpeech(question.item.spokenForm, "manual")}
                    >
                      <VolumeIcon />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="result-actions">
            {mistakeQuestions.length > 0 && (
              <button className="primary-button" type="button" onClick={retryMistakes}>
                間違えた問題を再挑戦
                <ArrowRightIcon />
              </button>
            )}
            <button className="secondary-button" type="button" onClick={startSession}>
              同じ条件でもう一度
            </button>
            <button className="text-button" type="button" onClick={goSetup}>練習方法を選び直す</button>
          </div>
        </div>
      )}


      {screen === "result" && !mode && (
        <div className="page-frame route-loading-page" role="status">
          <span className="eyebrow">Loading result</span>
          <strong>結果を読み込んでいます…</strong>
        </div>
      )}
    </main>
  );
}

function SpeechStatus({ status, heard }: { status: RecognitionStatus; heard: string }) {
  const copy: Record<RecognitionStatus, string> = {
    idle: "ボタンを押して発音",
    preparing: "マイクを準備しています…",
    listening: "聞き取っています…",
    correct: "正しく認識しました",
    miss: "別の語として認識されました",
    "no-match": "聞き取れませんでした。もう一度どうぞ",
    unsupported: "このブラウザは音声認識に対応していません",
  };
  const message = status === "no-match" && heard
    ? "別の語として認識されました"
    : copy[status];
  return (
    <div className={`speech-readout status-${status}`} aria-live="polite">
      <span>{message}</span>
      {heard && <small>認識：{heard}</small>}
    </div>
  );
}

function DrillPhaseStatus({
  phase,
  recognitionStatus,
  heard,
  showSpelling,
}: {
  phase: DrillPhase;
  recognitionStatus: RecognitionStatus;
  heard: string;
  showSpelling: boolean;
}) {
  let step = "LISTEN";
  let title = "お手本を聞いてください";
  let detail = "再生が終わると、マイクが自動で始まります";
  let icon = <VolumeIcon />;

  if (phase === "listening") {
    step = "SPEAK";
    title = "あなたの番です";
    detail = showSpelling
      ? "いま、表示された単語を発音してください"
      : "いま聞いた単語を発音してください";
    icon = <MicIcon />;
  } else if (phase === "result") {
    step = "CHECK";
    title = recognitionStatus === "correct"
      ? "認識できました"
      : recognitionStatus === "miss"
        ? "少し違って聞こえました"
        : "音声を確認できませんでした";
    detail = "次のお手本を準備しています…";
    icon = recognitionStatus === "correct" ? <CheckIcon /> : <span aria-hidden="true">!</span>;
  } else if (phase === "complete") {
    step = "COMPLETE";
    title = "10回完了しました";
    detail = "次の単語へ進みます…";
    icon = <CheckIcon />;
  } else if (phase === "unsupported") {
    step = "WAIT";
    title = "音声認識を利用できません";
    detail = "次の反復を準備しています…";
    icon = <span aria-hidden="true">!</span>;
  }

  return (
    <div
      className={`drill-phase-panel phase-${phase} status-${recognitionStatus}`}
      role="status"
      aria-live="polite"
    >
      <span className="drill-phase-icon">{icon}</span>
      <span className="drill-phase-copy">
        <small>{step}</small>
        <strong>{title}</strong>
        <span>{detail}</span>
        {heard && <em>認識：{heard}</em>}
      </span>
    </div>
  );
}
