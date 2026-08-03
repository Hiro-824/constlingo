export type CourseCategory = {
  id: string;
  label: string;
};

export type CoursePart = {
  id: string;
  label: string;
  description: string;
  categoryIds: string[];
};

export type VocabularyItem = {
  id: string;
  categoryId: string;
  target: string;
  meaning: string;
  partOfSpeech: string;
  note: string;
  spokenForm: string;
  acceptedSpokenForms: string[];
};

export type Course = {
  id: string;
  title: string;
  shortTitle: string;
  sourceLocale: string;
  targetLocale: string;
  speechLocale: string;
  targetLanguageLabel: string;
  datasetLabel: string;
  categories: CourseCategory[];
  parts: CoursePart[];
  preferredVoiceNames: string[];
  items: VocabularyItem[];
};

export type QuestionKind = "receptive" | "productive" | "drill";
export type QuestionPlan = "mixed" | "receptive" | "productive" | "drill";
export type PracticeOrder = "random" | "least-practiced" | "low-mastery";

export type Selection = {
  kind: "category" | "part" | "all";
  id: string;
  label: string;
};

export type StudyMode = {
  plan: QuestionPlan;
  order: PracticeOrder;
};

export type MasteryRecord = {
  receptive: boolean[];
  productive: boolean[];
};

export type MasteryStore = Record<string, MasteryRecord>;

export type Question = {
  id: string;
  kind: QuestionKind;
  item: VocabularyItem;
  choices?: VocabularyItem[];
  attempts: number;
  firstAttemptCorrect: boolean | null;
  firstResponse: string;
  completed: boolean;
  lastRecognized: string;
};
