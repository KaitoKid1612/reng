// Writes `paper` (the words the official sample papers asked about) into content/kanji/<level>.json
// from content/jlpt/official. Run after changing either: npm run kanji:paper
import { readFile, writeFile } from "node:fs/promises";

import { KANJI_LEVELS } from "@/lib/jlpt-kanji";
import { paperWordsOf } from "@/lib/kanji-paper";

async function main() {
  for (const level of KANJI_LEVELS) {
    const file = `content/kanji/${level}.json`;
    const data = JSON.parse(await readFile(file, "utf8"));
    const words = paperWordsOf(level);
    let marked = 0;
    for (const item of data.items) {
      const paper = words.get(item.kanji);
      delete item.paper;
      if (paper?.length) {
        item.paper = paper;
        marked += 1;
      }
    }
    await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
    console.log(`${file}: ${marked} kanji asked in the official sample papers`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
