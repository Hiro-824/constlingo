import LearningApp from "../components/learning-app";
import { loadCourse } from "../lib/load-course";
import { getRouteState } from "../lib/route-state";

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const course = await loadCourse();
  const state = getRouteState(course, await searchParams);

  return (
    <LearningApp
      course={course}
      screen="session"
      initialSelection={state.selection}
      initialPlan={state.plan}
      initialQuestionSelection={state.questionSelection}
      initialShowDrillSpelling={state.showDrillSpelling}
    />
  );
}
