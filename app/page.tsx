import { readFile } from "node:fs/promises";
import path from "node:path";

import LearningApp from "./components/learning-app";
import { buildSpanishCourse } from "./lib/spanish-course";

export default async function Home() {
  const datasetPath = path.join(process.cwd(), "public", "spanish_first_1000_words_jp.csv");
  const csv = await readFile(datasetPath, "utf8");
  const course = buildSpanishCourse(csv);

  return <LearningApp course={course} />;
}
