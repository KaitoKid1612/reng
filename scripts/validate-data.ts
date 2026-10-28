import catalog from "../content/lesson-catalog.json";
import { kanaItems, audioManifest } from "../lib/data";
import { lessonCatalogSchema } from "../lib/lesson-schema";

console.log(
  `Validated dataset: ${kanaItems.length} items; ${Object.keys(audioManifest.assets).length} mapped audio assets.`,
);
console.log(
  `Validated lesson catalog: ${lessonCatalogSchema.parse(catalog).lessons.length} lessons.`,
);
