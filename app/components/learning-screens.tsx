"use client";

import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";

import type {
  Course,
  Question,
  QuestionKind,
  QuestionPlan,
  QuestionSelectionMethod,
  QuestionSelectionSettings,
  Selection,
  StudyMode,
  VocabularyItem,
} from "../lib/types";

export type RecognitionStatus =
  | "idle"
  | "preparing"
  | "listening"
  | "correct"
  | "miss"
  | "no-match"
  | "unsupported";

export type PlaybackPurpose = "feedback" | "manual" | "drill-model";
export type DrillPhase = "model" | "listening" | "result" | "complete" | "unsupported";
export type Feedback = { status: "correct" | "miss"; answer: string } | null;

export const PLAN_DETAILS: Record<
  QuestionPlan,
  { label: string; shortLabel: string; description: string; number: string }
> = {
  mixed: {
    label: "ミックス",
    shortLabel: "西→日 + 日→西",
    description: "選択と発音を半分ずつ",
    number: "01",
  },
  productive: {
    label: "思い出して発音",
    shortLabel: "日→西 発音",
    description: "日本語からスペイン語を発音",
    number: "02",
  },
  receptive: {
    label: "見て意味を選ぶ",
    shortLabel: "西→日 四択",
    description: "スペイン語の意味を四択で回答",
    number: "03",
  },
  drill: {
    label: "発音反復",
    shortLabel: "聞く + 10回発音",
    description: "お手本のあとに10回発音",
    number: "04",
  },
};

export const QUESTION_SELECTION_DETAILS: Record<
  QuestionSelectionMethod,
  { label: string; description: string }
> = {
  interval: { label: "番号で指定", description: "開始〜終了" },
  random: { label: "ランダム", description: "問題数を指定" },
  "low-mastery": { label: "定着度を優先", description: "苦手な語から" },
};

export const KIND_LABELS: Record<QuestionKind, string> = {
  receptive: "見て意味を選ぶ",
  productive: "思い出して発音",
  drill: "発音反復",
};

export function describeQuestionSelection(settings: QuestionSelectionSettings) {
  if (settings.method === "interval") {
    return `${settings.start}〜${settings.end}番`;
  }
  if (settings.method === "low-mastery") {
    return `定着度が低い ${settings.count}問`;
  }
  return `ランダム ${settings.count}問`;
}

export function ArrowLeftIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect height="11" rx="5" width="7" x="8.5" y="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
    </svg>
  );
}

export function VolumeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M11 6 7 9H3v6h4l4 3V6Z" />
      <path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true">ñ</span>
      <span>Constlingo</span>
    </div>
  );
}

export function LibraryScreen({
  course,
  courseMasteryCount,
  onOpenRange,
}: {
  course: Course;
  courseMasteryCount: number;
  onOpenRange: (selection: Selection, method?: QuestionSelectionMethod) => void;
}) {
  return (
    <div className="page-frame library-page">
      <section className="course-showcase">
        <div className="course-showcase-copy">
          <span className="course-kicker">スペイン語 · 基本語彙</span>
          <h1>学ぶ範囲を選ぶ</h1>
          <p>ことばのまとまりから、次の練習を始めましょう。</p>
          <div className="library-meta" aria-label={`${course.items.length}語を収録`}>
            <strong>{course.items.length.toLocaleString()}語</strong>
            <span>{course.categories.length}カテゴリー</span>
            <span>{course.parts.length}パート</span>
          </div>
        </div>
        <div className="course-word-cloud" aria-hidden="true">
          <span>hola</span>
          <span>gracias</span>
          <span>¿qué tal?</span>
        </div>
      </section>

      <section className="library-collections" aria-labelledby="collection-heading">
        <div className="collection-block category-collection-block">
          <div className="collection-block-heading">
            <div>
              <span className="section-kicker">カテゴリー</span>
              <h2 id="collection-heading">テーマから選ぶ</h2>
            </div>
            <span>{course.categories.length}</span>
          </div>
          <div className="category-list">
            {course.categories.map((category, index) => {
              const count = course.items.filter((item) => item.categoryId === category.id).length;
              return (
                <button
                  className={`category-card tone-${index % 4}`}
                  key={category.id}
                  type="button"
                  onClick={() => onOpenRange({ kind: "category", id: category.id, label: category.label })}
                >
                  <span className="category-index">{String(index + 1).padStart(2, "0")}</span>
                  <strong>{category.label}</strong>
                  <small>{count}語</small>
                  <span className="row-arrow"><ArrowRightIcon /></span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="collection-block part-collection-block">
          <div className="collection-block-heading">
            <div>
              <span className="section-kicker">まとまり</span>
              <h2>パートから選ぶ</h2>
            </div>
            <span>{course.parts.length}</span>
          </div>
          <div className="part-list">
            {course.parts.map((part, index) => {
              const count = course.items.filter((item) => part.categoryIds.includes(item.categoryId)).length;
              return (
                <button
                  className="part-row"
                  key={part.id}
                  type="button"
                  onClick={() => onOpenRange({ kind: "part", id: part.id, label: part.label })}
                >
                  <span className="part-index">0{index + 1}</span>
                  <span><strong>{part.label}</strong><small>{part.description}</small></span>
                  <span className="part-count">{count}語</span>
                  <span className="row-arrow"><ArrowRightIcon /></span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="secondary-ranges">
          <span className="secondary-ranges-label">その他</span>
          <div className="utility-range-list">
            <button
              className="utility-range-row"
              type="button"
              onClick={() => onOpenRange({ kind: "all", id: "all", label: "全範囲" })}
            >
              <span><strong>全範囲</strong><small>{course.items.length.toLocaleString()}語</small></span>
              <ArrowRightIcon />
            </button>
            <button
              className="utility-range-row"
              type="button"
              onClick={() => onOpenRange({ kind: "all", id: "all", label: "全範囲" }, "low-mastery")}
            >
              <span>
                <strong>定着度が低い語</strong>
                <small>{courseMasteryCount === 0 ? "練習後に利用" : "自動で選択"}</small>
              </span>
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </section>

      <footer className="app-footer">
        <span>{course.datasetLabel}</span>
        <span>定着度はこの端末に保存</span>
        <span>音声認識はChromeを推奨</span>
      </footer>
    </div>
  );
}

export function PracticeSetupScreen({
  selection,
  rangeItemsCount,
  plan,
  setPlan,
  questionSelection,
  setQuestionSelection,
  showDrillSpelling,
  setShowDrillSpelling,
  selectedQuestionCount,
  onBack,
  onStart,
}: {
  selection: Selection;
  rangeItemsCount: number;
  plan: QuestionPlan;
  setPlan: Dispatch<SetStateAction<QuestionPlan>>;
  questionSelection: QuestionSelectionSettings;
  setQuestionSelection: Dispatch<SetStateAction<QuestionSelectionSettings>>;
  showDrillSpelling: boolean;
  setShowDrillSpelling: Dispatch<SetStateAction<boolean>>;
  selectedQuestionCount: number;
  onBack: () => void;
  onStart: () => void;
}) {
  const isSmartSelection = questionSelection.method === "low-mastery";
  return (
    <div className="page-frame setup-page">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeftIcon />
        範囲を選び直す
      </button>

      <section className="setup-object-header">
        <div>
          <span className="section-kicker">選択中の範囲</span>
          <h1>{selection.label}</h1>
        </div>
        <div className="setup-object-meta">
          <strong>{rangeItemsCount}語</strong>
          <span>{isSmartSelection ? "定着度を優先" : "収録語彙"}</span>
        </div>
      </section>

      <div className="setup-layout">
        <section className="setup-main" aria-labelledby="practice-heading">
          <div className="section-heading">
            <div>
              <span className="section-kicker">練習方法</span>
              <h2 id="practice-heading">どう練習しますか？</h2>
            </div>
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
        </section>

        <aside className="session-summary setup-summary">
          <div className="summary-heading">
            <span className="section-kicker">セッション設定</span>
            <h2>今回の演習</h2>
          </div>
          <dl>
            <div><dt>範囲</dt><dd>{selection.label}</dd></div>
            <div><dt>練習</dt><dd>{PLAN_DETAILS[plan].label}</dd></div>
          </dl>

          <section className="summary-question-settings" aria-labelledby="question-set-heading">
            <h3 id="question-set-heading">問題の選び方</h3>
            <div className="question-set-methods">
              {(Object.keys(QUESTION_SELECTION_DETAILS) as QuestionSelectionMethod[]).map((method) => {
                const detail = QUESTION_SELECTION_DETAILS[method];
                const selected = questionSelection.method === method;
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

            {questionSelection.method === "interval" ? (
              <div className="question-number-control range-number-control">
                <label className="number-field">
                  <span>開始</span>
                  <span className="number-input-wrap">
                    <input
                      aria-label="開始番号"
                      inputMode="numeric"
                      max={rangeItemsCount}
                      min="1"
                      type="number"
                      value={questionSelection.start}
                      onChange={(event) => {
                        const value = Math.min(
                          Math.max(Number.parseInt(event.target.value, 10) || 1, 1),
                          Math.max(rangeItemsCount, 1),
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
                      max={rangeItemsCount}
                      min={questionSelection.start}
                      type="number"
                      value={questionSelection.end}
                      onChange={(event) => {
                        const value = Math.min(
                          Math.max(
                            Number.parseInt(event.target.value, 10) || questionSelection.start,
                            questionSelection.start,
                          ),
                          Math.max(rangeItemsCount, 1),
                        );
                        setQuestionSelection((current) => ({ ...current, end: value }));
                      }}
                    />
                    <small>番</small>
                  </span>
                </label>
              </div>
            ) : (
              <div className="question-number-control count-control">
                <label className="number-field">
                  <span>問題数</span>
                  <span className="number-input-wrap">
                    <input
                      aria-label="問題数"
                      inputMode="numeric"
                      max={rangeItemsCount}
                      min="1"
                      type="number"
                      value={questionSelection.count}
                      onChange={(event) => {
                        const value = Math.min(
                          Math.max(Number.parseInt(event.target.value, 10) || 1, 1),
                          Math.max(rangeItemsCount, 1),
                        );
                        setQuestionSelection((current) => ({ ...current, count: value }));
                      }}
                    />
                    <small>問</small>
                  </span>
                </label>
              </div>
            )}

            {plan === "drill" && (
              <label className="spelling-setting">
                <span><strong>スペルを表示</strong><small>練習中も変更できます</small></span>
                <input
                  checked={showDrillSpelling}
                  type="checkbox"
                  onChange={(event) => setShowDrillSpelling(event.target.checked)}
                />
                <span className="toggle-track" aria-hidden="true"><span /></span>
              </label>
            )}
          </section>

          <div className="summary-question-result" aria-live="polite">
            <span>{describeQuestionSelection(questionSelection)}</span>
            <strong>{selectedQuestionCount}問</strong>
            <small>ランダム順</small>
          </div>

          <button
            className="primary-button summary-start"
            disabled={rangeItemsCount < (plan === "receptive" || plan === "mixed" ? 4 : 1)}
            type="button"
            onClick={onStart}
          >
            演習を始める
            <ArrowRightIcon />
          </button>
        </aside>
      </div>
    </div>
  );
}

export function SessionLoading() {
  return (
    <section className="session-page route-loading-page">
      <Brand compact />
      <div role="status">
        <span className="section-kicker">準備中</span>
        <strong>問題を準備しています…</strong>
      </div>
    </section>
  );
}

export function SessionScreen({
  course,
  currentQuestion,
  questionIndex,
  questionCount,
  answered,
  playbackPurpose,
  timeLeft,
  showDrillSpelling,
  selectedChoiceId,
  feedback,
  recognitionStatus,
  heard,
  drillPhase,
  drillRepeatCount,
  drillRepeatTarget,
  onExit,
  onSkip,
  onToggleSpelling,
  onSelectChoice,
  onFinishAttempt,
  onStartRecognition,
  onPlaySpeech,
}: {
  course: Course;
  currentQuestion: Question;
  questionIndex: number;
  questionCount: number;
  answered: boolean;
  playbackPurpose: PlaybackPurpose | null;
  timeLeft: number;
  showDrillSpelling: boolean;
  selectedChoiceId: string | null;
  feedback: Feedback;
  recognitionStatus: RecognitionStatus;
  heard: string;
  drillPhase: DrillPhase;
  drillRepeatCount: number;
  drillRepeatTarget: number;
  onExit: () => void;
  onSkip: () => void;
  onToggleSpelling: () => void;
  onSelectChoice: (choice: VocabularyItem) => void;
  onFinishAttempt: (correct: boolean, recognized?: string) => void;
  onStartRecognition: () => void;
  onPlaySpeech: (text: string, purpose: PlaybackPurpose) => void;
}) {
  const isDrill = currentQuestion.kind === "drill";
  const hasVisual = currentQuestion.kind !== "receptive" && Boolean(currentQuestion.item.visual);
  return (
    <section className={`session-page ${isDrill ? "is-drill-session" : ""}`}>
      <header className="session-header">
        <Brand compact />
        <div className="session-progress-copy">
          <span>{KIND_LABELS[currentQuestion.kind]}</span>
          <strong>{String(questionIndex + 1).padStart(2, "0")} <small>/ {questionCount}</small></strong>
        </div>
        <button className="exit-button" type="button" onClick={onExit}>終了</button>
      </header>
      <div className="session-progress-track">
        <div style={{ width: `${((questionIndex + 1) / questionCount) * 100}%` }} />
      </div>

      <div className="question-stage">
        <div className="question-context">
          <span>{currentQuestion.item.categoryId}</span>
          <div className="question-tools">
            {playbackPurpose && !isDrill && (
              <span className="audio-activity" role="status"><VolumeIcon />音声を再生中</span>
            )}
            {currentQuestion.kind === "receptive" && (
              <span className={`question-timer ${timeLeft <= 3 ? "is-low" : ""}`}>{timeLeft}s</span>
            )}
            {isDrill && (
              <button
                className="spelling-toggle-button"
                type="button"
                aria-pressed={showDrillSpelling}
                onClick={onToggleSpelling}
              >
                {showDrillSpelling ? "スペルを隠す" : "スペルを表示"}
              </button>
            )}
            <button className="question-skip-button" disabled={answered} type="button" onClick={onSkip}>
              スキップ<ArrowRightIcon />
            </button>
          </div>
        </div>

        <div className={`question-card question-${currentQuestion.kind} ${hasVisual ? "has-visual" : ""} ${feedback ? `has-${feedback.status}` : ""}`}>
          {!isDrill && <span className="question-label">{KIND_LABELS[currentQuestion.kind]}</span>}
          {currentQuestion.kind === "receptive" && (
            <><h1 lang={course.targetLocale}>{currentQuestion.item.spokenForm}</h1><p>もっとも近い意味を選んでください</p></>
          )}
          {currentQuestion.kind === "productive" && (
            <><MeaningPrompt item={currentQuestion.item} /><p>{course.targetLanguageLabel}で発音してください</p></>
          )}
          {isDrill && (
            <>
              <MeaningPrompt item={currentQuestion.item} />
              <div
                className={`spoken-word ${playbackPurpose === "drill-model" ? "is-playing" : ""} ${showDrillSpelling ? "" : "is-hidden"}`}
                lang={course.targetLocale}
              >
                <VolumeIcon />
                {showDrillSpelling ? currentQuestion.item.spokenForm : <span className="hidden-spelling" aria-label="スペル非表示">••••</span>}
              </div>
            </>
          )}
        </div>

        {feedback && !isDrill && (
          <div className={`feedback-strip feedback-${feedback.status}`} role="status">
            <span className="feedback-icon">{feedback.status === "correct" ? <CheckIcon /> : "!"}</span>
            <span><strong>{feedback.status === "correct" ? "そのとおり" : "もう一度"}</strong><small>正解：<span lang={course.targetLocale}>{feedback.answer}</span></small></span>
            <button type="button" aria-label="正解を聞く" onClick={() => onPlaySpeech(feedback.answer, "manual")}><VolumeIcon /></button>
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
                onClick={() => onSelectChoice(choice)}
              >
                <span>{String.fromCharCode(65 + index)}</span><strong>{choice.meaning}</strong>
              </button>
            ))}
            <button className="dont-know-button" disabled={answered} type="button" onClick={() => onFinishAttempt(false, "わからない")}>わからない</button>
          </div>
        )}

        {currentQuestion.kind === "productive" && (
          <div className="speech-control">
            <button
              className={`mic-button status-${recognitionStatus}`}
              disabled={answered || recognitionStatus === "preparing" || recognitionStatus === "listening"}
              type="button"
              onClick={onStartRecognition}
            >
              <MicIcon />
              <span>{recognitionStatus === "preparing" ? "準備しています" : recognitionStatus === "listening" ? "聞いています" : "発音する"}</span>
            </button>
            <SpeechStatus status={recognitionStatus} heard={heard} />
            <button className="dont-know-button" disabled={answered} type="button" onClick={() => onFinishAttempt(false, "わからない")}>わからない</button>
          </div>
        )}

        {isDrill && (
          <div className="drill-control">
            <DrillPhaseStatus
              phase={drillPhase}
              recognitionStatus={recognitionStatus}
              heard={showDrillSpelling ? heard : ""}
              showSpelling={showDrillSpelling}
            />
            <div className="drill-meter">
              <div className="drill-count"><strong>{String(drillRepeatCount).padStart(2, "0")}</strong><span>/ {drillRepeatTarget}</span></div>
              <div className="drill-progress"><div style={{ width: `${(drillRepeatCount / drillRepeatTarget) * 100}%` }} /></div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MeaningPrompt({ item }: { item: VocabularyItem }) {
  const visual = item.visual;
  if (!visual) {
    return <h1>{item.meaning}</h1>;
  }

  return (
    <figure className="meaning-visual">
      <div className="meaning-visual-frame" aria-hidden="true">
        <Image
          alt=""
          draggable={false}
          fill
          loading="eager"
          sizes="(max-width: 700px) calc(100vw - 66px), 540px"
          src={visual.src}
        />
      </div>
      <figcaption>{item.meaning}</figcaption>
    </figure>
  );
}

export function ResultScreen({
  course,
  mode,
  questions,
  selection,
  mistakeQuestions,
  skippedQuestionCount,
  firstTryCorrect,
  firstAttemptCount,
  onBack,
  onRetry,
  onRestart,
  onSetup,
  onPlaySpeech,
}: {
  course: Course;
  mode: StudyMode;
  questions: Question[];
  selection: Selection;
  mistakeQuestions: Question[];
  skippedQuestionCount: number;
  firstTryCorrect: number;
  firstAttemptCount: number;
  onBack: () => void;
  onRetry: () => void;
  onRestart: () => void;
  onSetup: () => void;
  onPlaySpeech: (text: string, purpose: PlaybackPurpose) => void;
}) {
  return (
    <div className="page-frame result-page">
      <button className="back-button" type="button" onClick={onBack}><ArrowLeftIcon />学ぶ範囲を選ぶ</button>
      <section className="result-hero">
        <span className="section-kicker">演習完了</span>
        {mode.plan === "drill" ? (
          <><h1><em>{questions.filter((question) => question.completed).length}</em>語</h1><p>発音反復が完了しました。{skippedQuestionCount > 0 ? ` スキップ ${skippedQuestionCount}語。` : ""}</p></>
        ) : (
          <>
            <h1><em>{firstTryCorrect}</em><span>/ {firstAttemptCount}</span></h1>
            <p>{firstAttemptCount === 0 ? "今回は採点した問題がありません。" : mistakeQuestions.length === 0 ? "すべて初回で正解しました。" : `${mistakeQuestions.length}語をもう一度確認しましょう。`}{skippedQuestionCount > 0 ? ` スキップ ${skippedQuestionCount}問。` : ""}</p>
          </>
        )}
        <div className="result-meta">
          <span>{PLAN_DETAILS[mode.plan].label} · {selection.label}</span>
          <span>{describeQuestionSelection(mode.questionSelection)} · ランダム順</span>
        </div>
      </section>

      {mistakeQuestions.length > 0 && (
        <section className="review-section">
          <div className="section-heading">
            <div><span className="section-kicker">復習</span><h2>今回つまずいた単語</h2></div>
            <span>{mistakeQuestions.length}語</span>
          </div>
          <div className="review-list">
            {mistakeQuestions.map((question) => (
              <div className="review-row" key={question.id}>
                <span className="review-kind">{question.kind === "receptive" ? "西→日" : "日→西"}</span>
                <span><strong lang={course.targetLocale}>{question.item.spokenForm}</strong><small>{question.item.meaning}{question.firstResponse ? ` · 初回回答：${question.firstResponse}` : ""}</small></span>
                <button type="button" aria-label={`${question.item.spokenForm}を聞く`} onClick={() => onPlaySpeech(question.item.spokenForm, "manual")}><VolumeIcon /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="result-actions">
        {mistakeQuestions.length > 0 && <button className="primary-button" type="button" onClick={onRetry}>間違えた問題を再挑戦<ArrowRightIcon /></button>}
        <button className="secondary-button" type="button" onClick={onRestart}>同じ条件でもう一度</button>
        <button className="text-button" type="button" onClick={onSetup}>練習方法を選び直す</button>
      </div>
    </div>
  );
}

export function ResultLoading() {
  return (
    <div className="page-frame route-loading-page" role="status">
      <span className="section-kicker">読み込み中</span>
      <strong>結果を読み込んでいます…</strong>
    </div>
  );
}

function SpeechStatus({ status, heard }: { status: RecognitionStatus; heard: string }) {
  const copy: Record<RecognitionStatus, string> = {
    idle: "自動でマイクを開始します",
    preparing: "マイクを準備しています…",
    listening: "聞き取っています…",
    correct: "正しく認識しました",
    miss: "別の語として認識されました",
    "no-match": "聞き取れませんでした。もう一度どうぞ",
    unsupported: "このブラウザは音声認識に対応していません",
  };
  const message = status === "no-match" && heard ? "別の語として認識されました" : copy[status];
  return <div className={`speech-readout status-${status}`} aria-live="polite"><span>{message}</span>{heard && <small>認識：{heard}</small>}</div>;
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
  let step = "聞く";
  let title = "お手本を聞いてください";
  let detail = "再生後、マイクが自動で始まります";
  let icon = <VolumeIcon />;

  if (phase === "listening") {
    step = "話す";
    title = "あなたの番です";
    detail = showSpelling ? "表示された単語を発音してください" : "いま聞いた単語を発音してください";
    icon = <MicIcon />;
  } else if (phase === "result") {
    step = "確認";
    title = recognitionStatus === "correct" ? "認識できました" : recognitionStatus === "miss" ? "少し違って聞こえました" : "音声を確認できませんでした";
    detail = "次のお手本を準備しています…";
    icon = recognitionStatus === "correct" ? <CheckIcon /> : <span aria-hidden="true">!</span>;
  } else if (phase === "complete") {
    step = "完了";
    title = "10回完了しました";
    detail = "次の単語へ進みます…";
    icon = <CheckIcon />;
  } else if (phase === "unsupported") {
    step = "待機";
    title = "音声認識を利用できません";
    detail = "次の反復を準備しています…";
    icon = <span aria-hidden="true">!</span>;
  }

  return (
    <div className={`drill-phase-panel phase-${phase} status-${recognitionStatus}`} role="status" aria-live="polite">
      <span className="drill-phase-icon">{icon}</span>
      <span className="drill-phase-copy"><small>{step}</small><strong>{title}</strong><span>{detail}</span>{heard && <em>認識：{heard}</em>}</span>
    </div>
  );
}
