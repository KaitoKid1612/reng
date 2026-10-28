import data from "@/content/kana.json";
import manifest from "@/content/audio-manifest.json";

import { kanaSchema, manifestSchema } from "./kana";

export const kanaItems = kanaSchema.parse(data).items;
export const audioManifest = manifestSchema.parse(manifest);
for (const id of Object.keys(audioManifest.assets)) {
  if (!kanaItems.some((item) => item.id === id)) {
    throw new Error(`Audio manifest contains an unknown kana ID: ${id}`);
  }
}
