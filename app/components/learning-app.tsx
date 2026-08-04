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
import {
  Brand,
  LibraryScreen,
  PLAN_DETAILS,
  PracticeSetupScreen,
  ResultLoading,
  ResultScreen,
  SessionLoading,
  SessionScreen,
  SettingsIcon,
} from "./learning-screens";
import type {
  DrillPhase,
  Feedback,
  PlaybackPurpose,
  RecognitionStatus,
} from "./learning-screens";

export type AppScreen = "library" | "setup" | "session" | "result";

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

const DEFAULT_QUESTION_SELECTION: QuestionSelectionSettings = {
  method: "random",
  start: 1,
  end: DEFAULT_QUESTION_COUNT,
  count: DEFAULT_QUESTION_COUNT,
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
  const playbackStartTimerRef = useRef<number | null>(null);
  const playbackFallbackTimerRef = useRef<number | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
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
    if (playbackStartTimerRef.current !== null) {
      window.clearTimeout(playbackStartTimerRef.current);
      playbackStartTimerRef.current = null;
    }
    if (playbackFallbackTimerRef.current !== null) {
      window.clearTimeout(playbackFallbackTimerRef.current);
      playbackFallbackTimerRef.current = null;
    }
    if (activeUtteranceRef.current) {
      activeUtteranceRef.current.onend = null;
      activeUtteranceRef.current.onerror = null;
      activeUtteranceRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setPlaybackPurpose(null);
  }, []);

  const playSpeech = useCallback(
    (text: string, purpose: PlaybackPurpose, onEnd?: () => void) => {
      const requestGeneration = playbackGenerationRef.current + 1;
      playbackGenerationRef.current = requestGeneration;
      if (playbackStartTimerRef.current !== null) {
        window.clearTimeout(playbackStartTimerRef.current);
        playbackStartTimerRef.current = null;
      }
      if (playbackFallbackTimerRef.current !== null) {
        window.clearTimeout(playbackFallbackTimerRef.current);
        playbackFallbackTimerRef.current = null;
      }

      if (!("speechSynthesis" in window)) {
        setPlaybackPurpose(null);
        onEnd?.();
        return;
      }

      if (activeUtteranceRef.current) {
        activeUtteranceRef.current.onend = null;
        activeUtteranceRef.current.onerror = null;
        activeUtteranceRef.current = null;
      }
      const synthesis = window.speechSynthesis;
      synthesis.cancel();
      setPlaybackPurpose(purpose);
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = selectedVoiceRef.current;
      utterance.lang = voice?.lang ?? course.speechLocale;
      utterance.voice = voice;
      utterance.rate = 0.92;
      utterance.pitch = 1;

      let completed = false;
      const complete = (cancelPendingSpeech = false) => {
        if (completed || playbackGenerationRef.current !== requestGeneration) {
          return;
        }
        completed = true;
        if (playbackStartTimerRef.current !== null) {
          window.clearTimeout(playbackStartTimerRef.current);
          playbackStartTimerRef.current = null;
        }
        if (playbackFallbackTimerRef.current !== null) {
          window.clearTimeout(playbackFallbackTimerRef.current);
          playbackFallbackTimerRef.current = null;
        }
        if (activeUtteranceRef.current === utterance) {
          activeUtteranceRef.current = null;
        }
        utterance.onend = null;
        utterance.onerror = null;
        if (cancelPendingSpeech) {
          synthesis.cancel();
        }
        setPlaybackPurpose(null);
        onEnd?.();
      };
      utterance.onend = () => complete();
      utterance.onerror = () => complete(true);

      // Chrome/macOS can leave a remote voice request alive briefly after cancel().
      // Flush once, wait for that cancellation to settle, then enqueue only the
      // utterance that still belongs to the current playback generation.
      playbackStartTimerRef.current = window.setTimeout(() => {
        if (playbackGenerationRef.current !== requestGeneration) {
          return;
        }
        synthesis.cancel();
        playbackStartTimerRef.current = window.setTimeout(() => {
          if (playbackGenerationRef.current !== requestGeneration) {
            return;
          }
          playbackStartTimerRef.current = null;
          activeUtteranceRef.current = utterance;
          synthesis.speak(utterance);
          playbackFallbackTimerRef.current = window.setTimeout(
            () => complete(true),
            Math.min(Math.max(text.length * 280, 2200), 5200),
          );
        }, 40);
      }, 60);
    },
    [course.speechLocale],
  );

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
      playSpeech(
        currentQuestion.item.spokenForm,
        "feedback",
        () => {
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
    stopPlayback();
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
  }, [answered, course.speechLocale, course.targetLocale, currentQuestion, finishAttempt, stopPlayback, stopRecognition]);

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
    let listeningStartTimer: number | null = null;
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
      stopPlayback();
      listeningStartTimer = window.setTimeout(() => {
        listeningStartTimer = null;
        if (cancelled) {
          return;
        }
        // Cancel again at the phase boundary so a delayed remote synthesis
        // request can never leak into the user's microphone window.
        stopPlayback();
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
        setDrillPhase("listening");
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
      }, 140);
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
      if (listeningStartTimer !== null) {
        window.clearTimeout(listeningStartTimer);
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
            <span className="section-kicker">音声設定</span>
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
          <p>このコースに適した音声を優先します。</p>
        </div>
      )}
    </header>
  );

  if (screen === "library") {
    return (
      <main className="app-shell">
        {header}
        <LibraryScreen
          course={course}
          courseMasteryCount={courseMasteryCount}
          onOpenRange={openRange}
        />
      </main>
    );
  }

  if (screen === "setup") {
    return (
      <main className="app-shell">
        {header}
        <PracticeSetupScreen
          selection={selection}
          rangeItemsCount={rangeItems.length}
          plan={plan}
          setPlan={setPlan}
          questionSelection={boundedQuestionSelection}
          setQuestionSelection={setQuestionSelection}
          showDrillSpelling={showDrillSpelling}
          setShowDrillSpelling={setShowDrillSpelling}
          selectedQuestionCount={selectedQuestionCount}
          onBack={goLibrary}
          onStart={startSession}
        />
      </main>
    );
  }

  if (screen === "session") {
    return (
      <main className="app-shell">
        {!currentQuestion ? (
          <SessionLoading />
        ) : (
          <SessionScreen
            course={course}
            currentQuestion={currentQuestion}
            questionIndex={questionIndex}
            questionCount={questions.length}
            answered={answered}
            playbackPurpose={playbackPurpose}
            timeLeft={timeLeft}
            showDrillSpelling={showDrillSpelling}
            selectedChoiceId={selectedChoiceId}
            feedback={feedback}
            recognitionStatus={recognitionStatus}
            heard={heard}
            drillPhase={drillPhase}
            drillRepeatCount={drillRepeatCount}
            drillRepeatTarget={DRILL_REPEAT_COUNT}
            onExit={leaveSession}
            onSkip={skipQuestion}
            onToggleSpelling={() => setShowDrillSpelling((visible) => !visible)}
            onSelectChoice={selectChoice}
            onFinishAttempt={finishAttempt}
            onStartRecognition={startRecognition}
            onPlaySpeech={playSpeech}
          />
        )}
      </main>
    );
  }

  return (
    <main className="app-shell">
      {header}
      {mode ? (
        <ResultScreen
          course={course}
          mode={mode}
          questions={questions}
          selection={selection}
          mistakeQuestions={mistakeQuestions}
          skippedQuestionCount={skippedQuestions.length}
          firstTryCorrect={firstTryCorrect}
          firstAttemptCount={firstAttemptQuestions.length}
          onBack={goLibrary}
          onRetry={retryMistakes}
          onRestart={startSession}
          onSetup={goSetup}
          onPlaySpeech={playSpeech}
        />
      ) : (
        <ResultLoading />
      )}
    </main>
  );
}
