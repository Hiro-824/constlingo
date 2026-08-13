import type { VocabularyVisual } from "./types";

const PEOPLE_RELATIONS_CATEGORY = "人・家族・関係";
const ASSET_ROOT = "/vocabulary/people-relations/items";

function toAssetSlug(target: string) {
  return target
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getSpanishVocabularyVisual(
  itemId: string,
  categoryId: string,
  target: string,
): VocabularyVisual | undefined {
  if (categoryId !== PEOPLE_RELATIONS_CATEGORY) {
    return undefined;
  }

  return { src: `${ASSET_ROOT}/${itemId}-${toAssetSlug(target)}.webp` };
}
