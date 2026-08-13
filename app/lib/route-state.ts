import type {
  Course,
  QuestionPlan,
  QuestionSelectionMethod,
  QuestionSelectionSettings,
  Selection,
} from "./types";
import { DEFAULT_QUESTION_COUNT } from "./learning";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, min), max) : fallback;
}

export function getRouteState(course: Course, params: SearchParams) {
  const kind = first(params.kind);
  const id = first(params.id);

  let selection: Selection = { kind: "all", id: "all", label: "全範囲" };
  if (kind === "all" && id === "low-mastery") {
    selection = { kind: "all", id: "low-mastery", label: "定着度が低い語" };
  } else if (kind === "category") {
    const category = course.categories.find((candidate) => candidate.id === id);
    if (category) {
      selection = { kind: "category", id: category.id, label: category.label };
    }
  } else if (kind === "part") {
    const part = course.parts.find((candidate) => candidate.id === id);
    if (part) {
      selection = { kind: "part", id: part.id, label: part.label };
    }
  }

  const requestedPlan = first(params.plan);
  const plan: QuestionPlan = ["mixed", "productive", "receptive", "drill"].includes(
    requestedPlan ?? "",
  )
    ? requestedPlan as QuestionPlan
    : "mixed";

  const selectedItemCount = selection.kind === "category"
    ? course.items.filter((item) => item.categoryId === selection.id).length
    : selection.kind === "part"
      ? course.items.filter((item) => course.parts
        .find((part) => part.id === selection.id)?.categoryIds.includes(item.categoryId)).length
      : course.items.length;
  const max = Math.max(selectedItemCount, 1);
  const requestedMethod = first(params.pick) ?? first(params.order);
  const method: QuestionSelectionMethod = ["interval", "random", "low-mastery"].includes(
    requestedMethod ?? "",
  )
    ? requestedMethod as QuestionSelectionMethod
    : selection.id === "low-mastery"
      ? "low-mastery"
      : "random";
  const start = boundedInteger(first(params.start), 1, 1, max);
  const end = boundedInteger(
    first(params.end),
    Math.min(DEFAULT_QUESTION_COUNT, max),
    start,
    max,
  );
  const count = boundedInteger(
    first(params.count),
    Math.min(DEFAULT_QUESTION_COUNT, max),
    1,
    max,
  );
  const questionSelection: QuestionSelectionSettings = { method, start, end, count };
  const showDrillSpelling = first(params.spell) !== "hide";

  return { selection, plan, questionSelection, showDrillSpelling };
}
