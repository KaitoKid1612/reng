import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { z } from "zod";

import { VOCAB_ICONS } from "../lib/vocab-icons";

// Writes the curated vocabulary icons as standalone SVG files. The source is the Iconify JSON
// of Microsoft Fluent Emoji Flat (MIT), e.g. @iconify-json/fluent-emoji-flat/icons.json:
//   node --import tsx scripts/extract-vocab-icons.ts --source path/to/icons.json
const iconSetSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  icons: z.record(
    z.string(),
    z.object({ body: z.string(), width: z.number().optional(), height: z.number().optional() }),
  ),
});

// Icons are served from the site's origin, so anything that could run code or load another
// resource is refused; gradients may only point inside the same file (#id).
const UNSAFE_MARKUP = /<script|<foreignObject|javascript:|\son[a-z]+\s*=/i;

function isSafeBody(body: string) {
  const references = [
    ...[...body.matchAll(/href\s*=\s*["']([^"']*)["']/gi)].map((match) => match[1]),
    ...[...body.matchAll(/url\(([^)]*)\)/gi)].map((match) => match[1].replace(/["'\s]/g, "")),
  ];
  return !UNSAFE_MARKUP.test(body) && references.every((value) => value.startsWith("#"));
}

async function main() {
  const { values } = parseArgs({ options: { source: { type: "string" } } });
  if (!values.source) {
    throw new Error("Provide --source path/to/fluent-emoji-flat/icons.json.");
  }
  const iconSet = iconSetSchema.parse(JSON.parse(await readFile(resolve(values.source), "utf8")));
  const directory = resolve("public/icons/vocab");
  await mkdir(directory, { recursive: true });
  for (const { name } of VOCAB_ICONS) {
    const icon = iconSet.icons[name];
    if (!icon) {
      throw new Error(`Icon ${name} is missing from the source set.`);
    }
    if (!isSafeBody(icon.body)) {
      throw new Error(`Icon ${name} contains markup that is not allowed.`);
    }
    const width = icon.width ?? iconSet.width ?? 32;
    const height = icon.height ?? iconSet.height ?? 32;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${icon.body}</svg>\n`;
    await writeFile(resolve(directory, `${name}.svg`), svg);
  }
  console.log(`Wrote ${VOCAB_ICONS.length} icons to public/icons/vocab.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
