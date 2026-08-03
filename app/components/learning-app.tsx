"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  appendMasteryOutcome,
  getMasteryRecord,
  getPracticePool,
  isAcceptedPronunciation,
  masteryLabel,
  QUESTIONS_PER_SESSION,
  shuffle,
} from "../lib/learning";
import type {
  Course,
  MasteryStore,
  PracticeOrder,
  Question,
  QuestionKind,
  QuestionPlan,
  Selection,
  StudyMode,
  VocabularyItem,
} from "../lib/types";

type Screen = "start" | "range" | "session" | "result";
type RangeView = "category" | "part";
type RecognitionStatus =
  | "idle"
  | "listening"
  | "correct"
  | "miss"
  | "no-match"
  | "unsupported";

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

const ORDER_DETAILS: Record<PracticeOrder, { label: string; description: string }> = {
  random: { label: "ランダム", description: "範囲から均等に選ぶ" },
  "least-practiced": { label: "未確認を優先", description: "まだ答えていない語から" },
  "low-mastery": { label: "定着度を優先", description: "最近つまずいた語から" },
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

function speak(
  text: string,
  locale: string,
  voice: SpeechSynthesisVoice | null,
  onEnd?: () => void,
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang ?? locale;
  utterance.voice = voice;
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
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
  return selected.map((item, index) => makeQuestion(item, kind, index, pool));
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

export default function LearningApp({ course }: { course: Course }) {
  const [screen, setScreen] = useState<Screen>("start");
  const [plan, setPlan] = useState<QuestionPlan>("mixed");
  const [order, setOrder] = useState<PracticeOrder>("random");
  const [rangeView, setRangeView] = useState<RangeView>("category");
  const [selection, setSelection] = useState<Selection>({ kind: "all", id: "all", label: "全範囲" });
  const [mode, setMode] = useState<StudyMode | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [heard, setHeard] = useState("");
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>("idle");
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
  const sessionCycleRef = useRef<{ key: string; seen: Set<string> } | null>(null);

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

  const courseMasteryCount = useMemo(
    () => Object.keys(mastery).filter((key) => key.startsWith(`${course.id}:`)).length,
    [course.id, mastery],
  );

  const needsReviewCount = useMemo(
    () =>
      course.items.filter((item) => {
        const record = getMasteryRecord(mastery, course.id, item.id);
        return masteryLabel(record, "mixed") === "要復習";
      }).length,
    [course, mastery],
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

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

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

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    const current = recognitionRef.current;
    recognitionRef.current = null;
    current?.abort();
  }, []);

  const resetQuestionUi = useCallback(() => {
    clearFeedbackTimer();
    stopRecognition();
    window.speechSynthesis?.cancel();
    setAnswered(false);
    setFeedback(null);
    setSelectedChoiceId(null);
    setHeard("");
    setRecognitionStatus("idle");
    setTimeLeft(TIMER_SECONDS);
    setDrillRepeatCount(0);
  }, [clearFeedbackTimer, stopRecognition]);

  useEffect(
    () => () => {
      clearFeedbackTimer();
      stopRecognition();
      window.speechSynthesis?.cancel();
    },
    [clearFeedbackTimer, stopRecognition],
  );

  const advanceQuestion = useCallback(() => {
    resetQuestionUi();
    setQuestionIndex((index) => {
      if (index + 1 >= questions.length) {
        setScreen("result");
        return index;
      }
      return index + 1;
    });
  }, [questions.length, resetQuestionUi]);

  const finishAttempt = useCallback(
    (correct: boolean, recognized = "") => {
      if (!currentQuestion || answered || currentQuestion.kind === "drill") {
        return;
      }
      const scoredKind = currentQuestion.kind;
      const isFirstAttempt = currentQuestion.attempts === 0;
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
        if (continued || !minimumDisplayDone || !speechDone) {
          return;
        }
        continued = true;
        if (correct) {
          advanceQuestion();
        } else {
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
      const speechFallback = window.setTimeout(() => {
        speechDone = true;
        continueWhenReady();
      }, Math.min(Math.max(currentQuestion.item.spokenForm.length * 220, 1800), 4800));
      speak(
        currentQuestion.item.spokenForm,
        course.speechLocale,
        selectedVoiceRef.current,
        () => {
          window.clearTimeout(speechFallback);
          speechDone = true;
          continueWhenReady();
        },
      );
    },
    [advanceQuestion, answered, course.id, course.speechLocale, currentQuestion, questionIndex, stopRecognition],
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
    let finalReceived = false;
    recognition.lang = course.speechLocale;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;
    setHeard("");
    setRecognitionStatus("listening");

    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) {
        return;
      }
      const result = event.results[event.results.length - 1];
      const alternatives = getRecognitionAlternatives(result);
      const leadingTranscript = alternatives[0] ?? "";
      setHeard(leadingTranscript);
      if (!result?.isFinal) {
        return;
      }
      finalReceived = true;
      const acceptedTranscript = findAcceptedAlternative(
        alternatives,
        currentQuestion.item,
        course.targetLocale,
      );
      finishAttempt(Boolean(acceptedTranscript), acceptedTranscript ?? leadingTranscript);
    };
    recognition.onerror = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setRecognitionStatus("no-match");
      }
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        if (!finalReceived) {
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
      answered ||
      currentQuestion.attempts >= 10
    ) {
      return;
    }

    const starter = window.setTimeout(startRecognition, 380);
    return () => window.clearTimeout(starter);
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
      setFeedback({ status: "correct", answer: currentQuestion.item.spokenForm });
      pauseTimer = window.setTimeout(() => {
        setQuestions((current) =>
          current.map((question, index) =>
            index === questionIndex ? { ...question, completed: true } : question,
          ),
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
      const Recognition = getSpeechRecognition();
      if (!Recognition) {
        setRecognitionStatus("unsupported");
        recognitionTimer = window.setTimeout(() => completeRound("unsupported"), 1700);
        return;
      }
      recognition = new Recognition();
      recognition.lang = course.speechLocale;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognitionRef.current = recognition;
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
      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const alternatives = getRecognitionAlternatives(result);
        const leadingTranscript = alternatives[0] ?? "";
        setHeard(leadingTranscript);
        if (result?.isFinal) {
          const acceptedTranscript = findAcceptedAlternative(
            alternatives,
            currentQuestion.item,
            course.targetLocale,
          );
          finishOnce(
            acceptedTranscript ? "correct" : "miss",
            acceptedTranscript ?? leadingTranscript,
          );
        }
      };
      recognition.onerror = () => finishOnce("no-match");
      recognition.onend = () => finishOnce("no-match");
      recognitionTimer = window.setTimeout(() => finishOnce("no-match"), 4500);
      try {
        recognition.start();
      } catch {
        finishOnce("no-match");
      }
    };

    function runRound() {
      if (cancelled) {
        return;
      }
      setRecognitionStatus("idle");
      setHeard("");
      speak(
        currentQuestion.item.spokenForm,
        course.speechLocale,
        selectedVoiceRef.current,
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
      window.speechSynthesis?.cancel();
    };
  }, [advanceQuestion, course.speechLocale, course.targetLocale, currentQuestion, questionIndex, screen]);

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
        nextQuestions = retry.map((question, index) =>
          makeQuestion(question.item, question.kind, index, rangeItems),
        );
      } else {
        const practicePool = getPracticePool(rangeItems, order, plan, mastery, course.id);
        const cycleKey = `${selection.kind}:${selection.id}:${plan}`;
        const cycle =
          sessionCycleRef.current?.key === cycleKey
            ? sessionCycleRef.current
            : { key: cycleKey, seen: new Set<string>() };
        let available = practicePool.filter((item) => !cycle.seen.has(item.id));
        if (available.length < Math.min(QUESTIONS_PER_SESSION, practicePool.length)) {
          cycle.seen = new Set<string>();
          available = practicePool;
        }
        const selectedItems = available.slice(0, QUESTIONS_PER_SESSION);
        selectedItems.forEach((item) => cycle.seen.add(item.id));
        sessionCycleRef.current = cycle;
        nextQuestions = buildQuestions(selectedItems, plan, rangeItems);
      }

      setMode({ plan, order });
      setQuestions(nextQuestions);
      setQuestionIndex(0);
      resetQuestionUi();
      setScreen("session");
    },
    [course.id, mastery, order, plan, rangeItems, resetQuestionUi, selection.id, selection.kind],
  );

  const leaveSession = () => {
    if (window.confirm("今回の演習を終了しますか？")) {
      resetQuestionUi();
      setQuestions([]);
      setScreen("start");
    }
  };

  const skipDrill = () => {
    if (!currentQuestion || currentQuestion.kind !== "drill") {
      return;
    }
    setQuestions((current) =>
      current.map((question, index) =>
        index === questionIndex ? { ...question, completed: true } : question,
      ),
    );
    advanceQuestion();
  };

  const skipAfterRepeatedMisses = () => {
    if (
      !currentQuestion ||
      currentQuestion.kind === "drill" ||
      currentQuestion.attempts < 10 ||
      answered
    ) {
      return;
    }
    setQuestions((current) =>
      current.map((question, index) =>
        index === questionIndex ? { ...question, completed: true } : question,
      ),
    );
    advanceQuestion();
  };

  const goHome = () => {
    resetQuestionUi();
    setQuestions([]);
    setScreen("start");
  };

  const voiceOptions = voices.filter((voice) =>
    voice.lang.toLocaleLowerCase().startsWith(course.speechLocale.split("-")[0].toLocaleLowerCase()),
  );

  const header = (
    <header className="app-header">
      <Brand />
      <div className="header-actions">
        <span className="course-chip">
          <span aria-hidden="true">ES</span>
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

      {screen === "start" && (
        <div className="page-frame start-page">
          <section className="start-hero">
            <div className="hero-copy">
              <span className="eyebrow">Listen · Recall · Speak</span>
              <h1>ことばを、<br /><em>声</em>で身につける。</h1>
              <p>
                見て、思い出して、声にする。基本1000語を、短い演習で確かな記憶へ。
              </p>
            </div>
            <div className="hero-orbit" aria-hidden="true">
              <span className="orbit-word orbit-word-one">escuchar</span>
              <span className="orbit-word orbit-word-two">recordar</span>
              <span className="orbit-word orbit-word-three">hablar</span>
              <div className="orbit-core"><VolumeIcon /></div>
            </div>
          </section>

          <section className="practice-picker" aria-labelledby="practice-heading">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Practice</span>
                <h2 id="practice-heading">練習方法を選ぶ</h2>
              </div>
              <p>1セット最大20問。今回の結果だけに集中します。</p>
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

            <div className="start-action-row">
              <div className="mastery-note">
                <span className="mastery-dot" />
                <span>
                  {courseMasteryCount === 0
                    ? "定着度は練習後、この端末に自動保存されます"
                    : `${courseMasteryCount}語を確認済み${needsReviewCount ? ` · 要復習 ${needsReviewCount}語` : ""}`}
                </span>
              </div>
              <button className="primary-button" type="button" onClick={() => setScreen("range")}>
                範囲を選ぶ
                <ArrowRightIcon />
              </button>
            </div>
          </section>

          <footer className="app-footer">
            <span>{course.datasetLabel}</span>
            <span>定着度のみを端末に保存</span>
            <span>Chromeでの音声認識を推奨</span>
          </footer>
        </div>
      )}

      {screen === "range" && (
        <div className="page-frame range-page">
          <button className="back-button" type="button" onClick={() => setScreen("start")}>
            <ArrowLeftIcon />
            練習方法へ
          </button>

          <div className="range-layout">
            <section className="range-main">
              <div className="range-heading">
                <span className="eyebrow">Select range</span>
                <h1>どこから練習しますか？</h1>
                <p>大きく始めても、テーマを絞っても。あとからいつでも選び直せます。</p>
              </div>

              <div className="quick-range-grid">
                <button
                  className={`quick-range-card ${selection.kind === "all" && order !== "low-mastery" ? "is-selected" : ""}`}
                  type="button"
                  onClick={() => {
                    setSelection({ kind: "all", id: "all", label: "全範囲" });
                    setOrder("random");
                  }}
                >
                  <span className="quick-icon">∞</span>
                  <span><strong>全範囲から</strong><small>{course.datasetLabel}を横断して出題</small></span>
                  <CheckIcon />
                </button>
                <button
                  className={`quick-range-card ${selection.kind === "all" && order === "low-mastery" ? "is-selected" : ""}`}
                  type="button"
                  onClick={() => {
                    setSelection({ kind: "all", id: "all", label: "定着度が低い語" });
                    setOrder("low-mastery");
                  }}
                >
                  <span className="quick-icon">↗</span>
                  <span><strong>定着度が低い語から</strong><small>最近つまずいた語を優先</small></span>
                  <CheckIcon />
                </button>
              </div>

              <div className="range-browser">
                <div className="range-tabs" role="tablist" aria-label="範囲の表示方法">
                  <button
                    className={rangeView === "category" ? "is-active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={rangeView === "category"}
                    onClick={() => setRangeView("category")}
                  >
                    カテゴリー
                  </button>
                  <button
                    className={rangeView === "part" ? "is-active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={rangeView === "part"}
                    onClick={() => setRangeView("part")}
                  >
                    パート
                  </button>
                </div>

                {rangeView === "category" ? (
                  <div className="category-list">
                    {course.categories.map((category, index) => {
                      const count = course.items.filter((item) => item.categoryId === category.id).length;
                      const selected = selection.kind === "category" && selection.id === category.id;
                      return (
                        <button
                          className={`category-row ${selected ? "is-selected" : ""}`}
                          key={category.id}
                          type="button"
                          onClick={() => setSelection({ kind: "category", id: category.id, label: category.label })}
                        >
                          <span className="category-index">{String(index + 1).padStart(2, "0")}</span>
                          <strong>{category.label}</strong>
                          <small>{count}語</small>
                          <span className="row-check"><CheckIcon /></span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="part-list">
                    {course.parts.map((part, index) => {
                      const count = course.items.filter((item) => part.categoryIds.includes(item.categoryId)).length;
                      const selected = selection.kind === "part" && selection.id === part.id;
                      return (
                        <button
                          className={`part-row ${selected ? "is-selected" : ""}`}
                          key={part.id}
                          type="button"
                          onClick={() => setSelection({ kind: "part", id: part.id, label: part.label })}
                        >
                          <span className="part-index">0{index + 1}</span>
                          <span><strong>{part.label}</strong><small>{part.description}</small></span>
                          <span className="part-count">{count}語</span>
                          <span className="row-check"><CheckIcon /></span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <aside className="session-summary">
              <span className="eyebrow">Your session</span>
              <h2>今回の演習</h2>
              <dl>
                <div><dt>練習</dt><dd>{PLAN_DETAILS[plan].label}</dd></div>
                <div><dt>範囲</dt><dd>{selection.label}</dd></div>
                <div><dt>問題数</dt><dd>{Math.min(QUESTIONS_PER_SESSION, rangeItems.length)}問</dd></div>
              </dl>

              {plan !== "drill" && selection.label !== "定着度が低い語" && (
                <fieldset className="order-fieldset">
                  <legend>出題順</legend>
                  {(Object.keys(ORDER_DETAILS) as PracticeOrder[]).map((option) => (
                    <label key={option}>
                      <input
                        checked={order === option}
                        name="practice-order"
                        type="radio"
                        onChange={() => setOrder(option)}
                      />
                      <span><strong>{ORDER_DETAILS[option].label}</strong><small>{ORDER_DETAILS[option].description}</small></span>
                    </label>
                  ))}
                </fieldset>
              )}

              <button
                className="primary-button summary-start"
                disabled={rangeItems.length < (plan === "receptive" || plan === "mixed" ? 4 : 1)}
                type="button"
                onClick={() => beginSession()}
              >
                この内容で始める
                <ArrowRightIcon />
              </button>
              <p className="summary-note">日付や連続日数は記録しません。今回の初回回答だけを定着度に反映します。</p>
            </aside>
          </div>
        </div>
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
              {currentQuestion.kind === "receptive" && (
                <span className={`question-timer ${timeLeft <= 3 ? "is-low" : ""}`}>{timeLeft}s</span>
              )}
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
                  <button
                    className="spoken-word"
                    lang={course.targetLocale}
                    type="button"
                    onClick={() => speak(currentQuestion.item.spokenForm, course.speechLocale, selectedVoiceRef.current)}
                  >
                    <VolumeIcon />
                    {currentQuestion.item.spokenForm}
                  </button>
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
                  onClick={() => speak(feedback.answer, course.speechLocale, selectedVoiceRef.current)}
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
                  disabled={answered || recognitionStatus === "listening"}
                  type="button"
                  onClick={startRecognition}
                >
                  <MicIcon />
                  <span>{recognitionStatus === "listening" ? "聞いています" : "発音する"}</span>
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
                <div className="drill-count">
                  <strong>{String(drillRepeatCount).padStart(2, "0")}</strong>
                  <span>/ {DRILL_REPEAT_COUNT}</span>
                </div>
                <div className="drill-progress"><div style={{ width: `${(drillRepeatCount / DRILL_REPEAT_COUNT) * 100}%` }} /></div>
                <SpeechStatus status={recognitionStatus} heard={heard} drill />
                <button className="dont-know-button" type="button" onClick={skipDrill}>次の単語へ</button>
              </div>
            )}

            {currentQuestion.kind !== "drill" &&
              currentQuestion.attempts >= 10 &&
              !answered && (
                <div className="repeated-miss-action">
                  <span>10回試しました。ここでは無理に足止めしません。</span>
                  <button type="button" onClick={skipAfterRepeatedMisses}>
                    正解を確認して次へ
                    <ArrowRightIcon />
                  </button>
                </div>
              )}
          </div>
        </section>
      )}

      {screen === "result" && mode && (
        <div className="page-frame result-page">
          <button className="back-button" type="button" onClick={goHome}>
            <ArrowLeftIcon />
            開始画面へ
          </button>

          <section className="result-hero">
            <span className="eyebrow">Session complete</span>
            {mode.plan === "drill" ? (
              <>
                <h1><em>{questions.filter((question) => question.completed).length}</em>語</h1>
                <p>声に出した分だけ、ことばは自分のものになる。</p>
              </>
            ) : (
              <>
                <h1><em>{firstTryCorrect}</em><span>/ {firstAttemptQuestions.length}</span></h1>
                <p>{mistakeQuestions.length === 0 ? "すべて初回で正解しました。" : `初回正解は${firstTryCorrect}問。${mistakeQuestions.length}語をもう一度確認しましょう。`}</p>
              </>
            )}
            <div className="result-meta">
              <span>{PLAN_DETAILS[mode.plan].label}</span>
              <span>{selection.label}</span>
              <span>{ORDER_DETAILS[mode.order].label}</span>
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
                      onClick={() => speak(question.item.spokenForm, course.speechLocale, selectedVoiceRef.current)}
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
              <button className="primary-button" type="button" onClick={() => beginSession(mistakeQuestions)}>
                間違えた問題を再挑戦
                <ArrowRightIcon />
              </button>
            )}
            <button className="secondary-button" type="button" onClick={() => beginSession()}>
              同じ条件でもう一度
            </button>
            <button className="text-button" type="button" onClick={goHome}>練習方法を選び直す</button>
          </div>
        </div>
      )}
    </main>
  );
}

function SpeechStatus({
  status,
  heard,
  drill = false,
}: {
  status: RecognitionStatus;
  heard: string;
  drill?: boolean;
}) {
  const copy: Record<RecognitionStatus, string> = {
    idle: drill ? "音声を聞いて、続けて発音" : "ボタンを押して発音",
    listening: "聞き取っています…",
    correct: drill ? "認識できました" : "正しく認識しました",
    miss: "別の語として認識されました",
    "no-match": "聞き取れませんでした。もう一度どうぞ",
    unsupported: "このブラウザは音声認識に対応していません",
  };
  return (
    <div className={`speech-readout status-${status}`} aria-live="polite">
      <span>{copy[status]}</span>
      {heard && <small>認識：{heard}</small>}
    </div>
  );
}
