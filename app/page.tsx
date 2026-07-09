"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Word = {
  id: number;
  block: string;
  category: string;
  spanish: string;
  japanese: string;
  part: string;
  memo: string;
};

type Screen = "setup" | "study" | "test" | "result";
type TestKind = "speak" | "choice";
type RecognitionStatus = "idle" | "listening" | "correct" | "miss" | "unsupported";

type TestQuestion = {
  id: string;
  kind: TestKind;
  word: Word;
  choices?: Word[];
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

const BLOCKS = Array.from({ length: 10 }, (_, index) => `${index + 1}/10`);
const TEST_LIMIT_SECONDS = 10;

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

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
  const googleSpanish = spanishVoices.find(
    (voice) => voice.name === "Google español" && voice.lang === "es-ES",
  );
  const preferredNames = ["google español", "monica", "paulina", "jorge", "marisol", "diego", "juan"];

  if (googleSpanish) {
    return googleSpanish;
  }

  return (
    [...spanishVoices].sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aNameScore = preferredNames.findIndex((name) => aName.includes(name));
      const bNameScore = preferredNames.findIndex((name) => bName.includes(name));
      const aScore =
        (a.lang.toLowerCase() === "es-es" ? 40 : 0) +
        (a.localService ? 20 : 0) +
        (aNameScore >= 0 ? 20 - aNameScore : 0);
      const bScore =
        (b.lang.toLowerCase() === "es-es" ? 40 : 0) +
        (b.localService ? 20 : 0) +
        (bNameScore >= 0 ? 20 - bNameScore : 0);
      return bScore - aScore;
    })[0] ?? null
  );
}

function speakSpanish(
  text: string,
  options: { voice?: SpeechSynthesisVoice | null; rate?: number },
  onEnd?: () => void,
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  if (options.voice) {
    utterance.voice = options.voice;
    utterance.lang = options.voice.lang;
  }
  utterance.rate = options.rate ?? 0.92;
  utterance.pitch = 1;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

function blockLabel(block: string) {
  return `単元 ${block.replace("/10", "")}`;
}

export default function Home() {
  const [words, setWords] = useState<Word[]>([]);
  const [selectedBlocks, setSelectedBlocks] = useState(() => new Set(BLOCKS));
  const [screen, setScreen] = useState<Screen>("setup");
  const [studyIndex, setStudyIndex] = useState(0);
  const [heard, setHeard] = useState("");
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>("idle");
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TEST_LIMIT_SECONDS);
  const [choiceSelection, setChoiceSelection] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [speechRate, setSpeechRate] = useState(0.92);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeQuestionIdRef = useRef("");
  const questionFinishingRef = useRef(false);
  const studyAdvancingRef = useRef(false);
  const studyPlaybackTokenRef = useRef(0);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const speechRateRef = useRef(speechRate);

  const scopedWords = useMemo(
    () => words.filter((word) => selectedBlocks.has(word.block)),
    [selectedBlocks, words],
  );
  const currentStudyWord = scopedWords[studyIndex % Math.max(scopedWords.length, 1)];
  const currentQuestion = questions[questionIndex];
  const selectedCount = selectedBlocks.size;
  const spanishVoices = useMemo(
    () => voices.filter((voice) => voice.lang.toLowerCase().startsWith("es")),
    [voices],
  );
  const selectedVoice = useMemo(() => {
    const selected = spanishVoices.find((voice) => voice.voiceURI === voiceURI);
    return selected ?? getPreferredSpanishVoice(spanishVoices);
  }, [spanishVoices, voiceURI]);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
    speechRateRef.current = speechRate;
  }, [selectedVoice, speechRate]);

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
            part: row[5] ?? "",
            memo: row[6] ?? "",
          }));
        setWords(parsed);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      setVoiceURI((current) => {
        if (current && availableVoices.some((voice) => voice.voiceURI === current)) {
          return current;
        }
        return getPreferredSpanishVoice(availableVoices)?.voiceURI ?? "";
      });
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const stopRecognition = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setRecognitionStatus("idle");
  }, []);

  const nextStudy = useCallback(() => {
    studyPlaybackTokenRef.current += 1;
    studyAdvancingRef.current = false;
    stopRecognition();
    setHeard("");
    setRecognitionStatus("idle");
    setStudyIndex((index) => (scopedWords.length ? (index + 1) % scopedWords.length : 0));
  }, [scopedWords.length, stopRecognition]);

  const finishQuestion = useCallback(
    (questionId: string, isCorrect: boolean) => {
      if (questionFinishingRef.current || activeQuestionIdRef.current !== questionId) {
        return;
      }

      questionFinishingRef.current = true;
      stopRecognition();
      setAnswered(true);
      setRecognitionStatus(isCorrect ? "correct" : "miss");
      if (isCorrect) {
        setScore((value) => value + 1);
      }
      window.setTimeout(() => {
        setAnswered(false);
        setChoiceSelection(null);
        setHeard("");
        setTimeLeft(TEST_LIMIT_SECONDS);
        setRecognitionStatus("idle");
        setQuestionIndex((index) => {
          if (index + 1 >= questions.length) {
            setScreen("result");
            return index;
          }
          return index + 1;
        });
        window.setTimeout(() => {
          questionFinishingRef.current = false;
        }, 0);
      }, 850);
    },
    [questions.length, stopRecognition],
  );

  const startRecognition = useCallback(
    (word: Word, mode: "study" | "test", questionId?: string) => {
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
        const result = event.results[event.results.length - 1];
        const transcript = result?.[0]?.transcript ?? "";
        const correct = isClosePronunciation(transcript, word.spanish);
        setHeard(transcript);

        if (mode === "test") {
          if (correct || result?.isFinal) {
            finishQuestion(questionId ?? "", correct);
          }
          return;
        }

        if (correct && !studyAdvancingRef.current) {
          studyAdvancingRef.current = true;
          setRecognitionStatus("correct");
          window.setTimeout(nextStudy, 620);
          return;
        }

        if (result?.isFinal) {
          setRecognitionStatus("miss");
        }
      };

      recognition.onerror = () => {
        if (mode === "test") {
          finishQuestion(questionId ?? "", false);
        } else {
          setRecognitionStatus("miss");
        }
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setRecognitionStatus((status) => (status === "listening" ? "idle" : status));
      };

      try {
        recognition.start();
      } catch {
        setRecognitionStatus("idle");
      }
    },
    [finishQuestion, nextStudy, stopRecognition],
  );

  useEffect(() => {
    if (screen !== "test" || !currentQuestion || answered) {
      return;
    }

    activeQuestionIdRef.current = currentQuestion.id;
    questionFinishingRef.current = false;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(TEST_LIMIT_SECONDS - elapsed, 0);
      setTimeLeft(remaining);

      if (remaining === 0) {
        window.clearInterval(timer);
        finishQuestion(currentQuestion.id, false);
      }
    }, 200);

    return () => window.clearInterval(timer);
  }, [answered, currentQuestion, finishQuestion, screen]);

  useEffect(() => {
    if (screen !== "test" || !currentQuestion || answered) {
      return;
    }

    const starter = window.setTimeout(() => {
      if (currentQuestion.kind === "choice") {
        speakSpanish(currentQuestion.word.spanish, { rate: speechRate, voice: selectedVoice });
      } else {
        startRecognition(currentQuestion.word, "test", currentQuestion.id);
      }
    }, currentQuestion.kind === "choice" ? 180 : 220);

    return () => window.clearTimeout(starter);
  }, [answered, currentQuestion, screen, selectedVoice, speechRate, startRecognition]);

  const playStudyPrompt = useCallback(() => {
    if (!currentStudyWord) {
      return;
    }

    const token = studyPlaybackTokenRef.current + 1;
    studyPlaybackTokenRef.current = token;
    stopRecognition();
    setHeard("");
    setRecognitionStatus("idle");
    speakSpanish(
      currentStudyWord.spanish,
      { rate: speechRateRef.current, voice: selectedVoiceRef.current },
      () => {
        window.setTimeout(() => {
          if (studyPlaybackTokenRef.current === token) {
            startRecognition(currentStudyWord, "study");
          }
        }, 40);
      },
    );
  }, [currentStudyWord, startRecognition, stopRecognition]);

  useEffect(() => {
    if (screen !== "study" || !currentStudyWord) {
      return;
    }

    studyAdvancingRef.current = false;
    const starter = window.setTimeout(() => {
      const token = studyPlaybackTokenRef.current + 1;
      studyPlaybackTokenRef.current = token;
      stopRecognition();
      setHeard("");
      setRecognitionStatus("idle");
      speakSpanish(
        currentStudyWord.spanish,
        { rate: speechRateRef.current, voice: selectedVoiceRef.current },
        () => {
          window.setTimeout(() => {
            if (studyPlaybackTokenRef.current === token) {
              startRecognition(currentStudyWord, "study");
            }
          }, 40);
        },
      );
    }, 120);

    return () => {
      window.clearTimeout(starter);
      studyPlaybackTokenRef.current += 1;
    };
  }, [currentStudyWord, screen, startRecognition, stopRecognition]);

  const beginStudy = () => {
    setScreen("study");
    setStudyIndex(0);
    setHeard("");
    setRecognitionStatus("idle");
  };

  const makeQuestions = () => {
    const pool = shuffle(scopedWords);
    const speakWords = pool.slice(0, 10);
    const choiceWords = pool.slice(10, 20);
    const choiceQuestions = choiceWords.map<TestQuestion>((word) => {
      const distractors = shuffle(scopedWords.filter((item) => item.id !== word.id)).slice(0, 3);
      return {
        id: `choice-${word.id}`,
        kind: "choice",
        word,
        choices: shuffle([word, ...distractors]),
      };
    });

    return shuffle([
      ...speakWords.map<TestQuestion>((word) => ({
        id: `speak-${word.id}`,
        kind: "speak",
        word,
      })),
      ...choiceQuestions,
    ]);
  };

  const beginTest = () => {
    stopRecognition();
    questionFinishingRef.current = false;
    activeQuestionIdRef.current = "";
    setQuestions(makeQuestions());
    setQuestionIndex(0);
    setScore(0);
    setAnswered(false);
    setChoiceSelection(null);
    setHeard("");
    setTimeLeft(TEST_LIMIT_SECONDS);
    setRecognitionStatus("idle");
    setScreen("test");
  };

  const toggleBlock = (block: string) => {
    setSelectedBlocks((current) => {
      const next = new Set(current);
      if (next.has(block)) {
        next.delete(block);
      } else {
        next.add(block);
      }
      return next;
    });
  };

  const selectChoice = (choice: Word) => {
    if (answered || !currentQuestion) {
      return;
    }

    setChoiceSelection(choice.id);
    finishQuestion(currentQuestion.id, choice.id === currentQuestion.word.id);
  };

  return (
    <main className="app-shell">
      <section className="top-band">
        <div>
          <p className="eyebrow">Constlingo</p>
          <h1>スペイン語1000語</h1>
        </div>
        <div className="stats-strip">
          <span>{selectedCount} 単元</span>
          <span>{scopedWords.length} 語</span>
        </div>
      </section>

      {screen === "setup" && (
        <section className="workspace">
          <div className="setup-layout">
            <div>
          <div className="section-head">
            <h2>範囲</h2>
            <div className="range-actions">
              <button type="button" onClick={() => setSelectedBlocks(new Set(BLOCKS))}>
                全選択
              </button>
              <button type="button" onClick={() => setSelectedBlocks(new Set())}>
                クリア
              </button>
            </div>
          </div>

          <div className="unit-grid">
            {BLOCKS.map((block) => {
              const count = words.filter((word) => word.block === block).length;
              const active = selectedBlocks.has(block);
              return (
                <button
                  className={active ? "unit-tile active" : "unit-tile"}
                  key={block}
                  onClick={() => toggleBlock(block)}
                  type="button"
                >
                  <span>{blockLabel(block)}</span>
                  <strong>{count}</strong>
                </button>
              );
            })}
          </div>
            </div>

            <aside className="sound-panel">
              <div>
                <p className="panel-kicker">Audio</p>
                <h2>音声</h2>
              </div>
              <label>
                <span>スペイン語音声</span>
                <select
                  onChange={(event) => setVoiceURI(event.target.value)}
                  value={selectedVoice?.voiceURI ?? ""}
                >
                  {spanishVoices.length === 0 ? (
                    <option value="">ブラウザ既定</option>
                  ) : (
                    spanishVoices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} / {voice.lang}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label>
                <span>速度 {speechRate.toFixed(2)}</span>
                <input
                  max="1.12"
                  min="0.72"
                  onChange={(event) => setSpeechRate(Number(event.target.value))}
                  step="0.02"
                  type="range"
                  value={speechRate}
                />
              </label>
              <button
                className="sample-button"
                onClick={() => speakSpanish("buenos días", { rate: speechRate, voice: selectedVoice })}
                type="button"
              >
                試聴
              </button>
            </aside>
          </div>

          <div className="mode-grid">
            <button
              className="mode-button primary"
              disabled={scopedWords.length === 0}
              onClick={beginStudy}
              type="button"
            >
              <span>学習モード</span>
              <small>日本語から聞いて発音</small>
            </button>
            <button
              className="mode-button"
              disabled={scopedWords.length < 20}
              onClick={beginTest}
              type="button"
            >
              <span>テストモード</span>
              <small>20問・各10秒</small>
            </button>
          </div>
        </section>
      )}

      {screen === "study" && currentStudyWord && (
        <section className="workspace practice-workspace">
          <div className="toolbar">
            <button type="button" onClick={() => setScreen("setup")}>
              範囲へ
            </button>
            <span>
              {studyIndex + 1} / {scopedWords.length}
            </span>
          </div>

          <div className="prompt-panel">
            <p className="category">{currentStudyWord.category}</p>
            <h2>{currentStudyWord.japanese}</h2>
            <p className="part">{currentStudyWord.part}</p>
          </div>

          <div className="control-row">
            <button className="listen-button" type="button" onClick={playStudyPrompt}>
              再生して発音
            </button>
            <button type="button" onClick={() => startRecognition(currentStudyWord, "study")}>
              マイク
            </button>
            <button type="button" onClick={nextStudy}>
              次へ
            </button>
          </div>

          <StatusLine status={recognitionStatus} heard={heard} />
        </section>
      )}

      {screen === "test" && currentQuestion && (
        <section className="workspace test-workspace">
          <div className="timer-track" aria-label={`残り${timeLeft}秒`}>
            <div style={{ width: `${(timeLeft / TEST_LIMIT_SECONDS) * 100}%` }} />
          </div>

          <div className="toolbar">
            <button type="button" onClick={() => setScreen("setup")}>
              終了
            </button>
            <span>
              {questionIndex + 1} / {questions.length}
            </span>
            <strong>{score} 点</strong>
          </div>

          {currentQuestion.kind === "speak" ? (
            <>
              <div className="prompt-panel">
                <p className="category">発音</p>
                <h2>{currentQuestion.word.japanese}</h2>
                <p className="part">10秒以内</p>
              </div>
              <div className="control-row">
                <button
                  type="button"
                  onClick={() => startRecognition(currentQuestion.word, "test", currentQuestion.id)}
                >
                  マイク
                </button>
              </div>
              <StatusLine status={recognitionStatus} heard={heard} />
            </>
          ) : (
            <>
              <div className="prompt-panel">
                <p className="category">聞き取り</p>
                <h2>音声を聞いて選択</h2>
                <p className="part">10秒以内</p>
              </div>
              <div className="control-row">
                <button
                  type="button"
                  onClick={() =>
                    speakSpanish(currentQuestion.word.spanish, {
                      rate: speechRate,
                      voice: selectedVoice,
                    })
                  }
                >
                  もう一度
                </button>
              </div>
              <div className="choice-grid">
                {currentQuestion.choices?.map((choice) => (
                  <button
                    className={choiceSelection === choice.id ? "choice selected" : "choice"}
                    disabled={answered}
                    key={choice.id}
                    onClick={() => selectChoice(choice)}
                    type="button"
                  >
                    {choice.japanese}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {screen === "result" && (
        <section className="workspace result-workspace">
          <p className="eyebrow">Result</p>
          <h2>{score} / {questions.length}</h2>
          <div className="mode-grid compact">
            <button className="mode-button primary" type="button" onClick={beginTest}>
              もう一度
            </button>
            <button className="mode-button" type="button" onClick={() => setScreen("setup")}>
              範囲へ
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function StatusLine({
  status,
  heard,
}: {
  status: RecognitionStatus;
  heard: string;
}) {
  const label = {
    idle: "待機中",
    listening: "聞き取り中",
    correct: "OK",
    miss: "もう一度",
    unsupported: "音声認識非対応",
  }[status];

  return (
    <div className={`status-line ${status}`}>
      <span>{label}</span>
      <span>{heard ? `認識: ${heard}` : ""}</span>
    </div>
  );
}
