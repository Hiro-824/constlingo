import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import { buildSpanishCourse } from "./spanish-course";

export const loadCourse = cache(async () => {
  const datasetPath = path.join(process.cwd(), "public", "spanish_first_1000_words_jp.csv");
  const csv = await readFile(datasetPath, "utf8");
  return buildSpanishCourse(csv);
});
