import LearningApp from "../components/learning-app";
import { loadCourse } from "../lib/load-course";

export default async function ResultPage() {
  const course = await loadCourse();
  return <LearningApp course={course} screen="result" />;
}
