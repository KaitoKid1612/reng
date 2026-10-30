import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Composes slide pictures for starter lessons from the curated vocabulary icons in
// public/icons/vocab (Microsoft Fluent Emoji Flat, MIT). Pictures hold numbered cards of icons and
// no words: the slide caption and alt text carry the language. Re-run after changing a picture:
//   node --import tsx scripts/compose-lesson-pictures.ts
interface LessonPicture {
  file: string;
  width: number;
  height: number;
  columns: number;
  // Numbered white cards for drills; a plain grid for a title emblem.
  isDrill: boolean;
  cards: readonly (readonly string[])[];
}

const PICTURES: readonly LessonPicture[] = [
  {
    // Lesson 12, より／どちら: fast, light, liked, expensive.
    file: "minna-1-12-compare.svg",
    width: 1000,
    height: 480,
    columns: 2,
    isDrill: true,
    cards: [
      ["airplane", "train"],
      ["backpack", "handbag"],
      ["cherry-blossom", "maple-leaf"],
      ["cut-of-meat", "pig-face"],
    ],
  },
  {
    // Lesson 12, いちばん: fruit, seasons, sports.
    file: "minna-1-12-best.svg",
    width: 1000,
    height: 480,
    columns: 1,
    isDrill: true,
    cards: [
      ["red-apple", "banana", "mango", "grapes"],
      ["cherry-blossom", "sun", "maple-leaf", "snowman"],
      ["soccer-ball", "tennis", "person-swimming"],
    ],
  },
  {
    // Lesson 12 title: the four seasons of its dialogues.
    file: "minna-1-12-seasons.svg",
    width: 320,
    height: 320,
    columns: 2,
    isDrill: false,
    cards: [["cherry-blossom"], ["sun"], ["maple-leaf"], ["snowman"]],
  },
];

const PADDING = 16;
const GAP = 24;
const ICON_GAP = 32;
const BADGE_RADIUS = 22;
const UNSAFE_MARKUP = /<script|<foreignObject|javascript:|\son[a-z]+\s*=|href\s*=\s*["'](?!#)/i;

// Two decimals keep the generated files short and stable.
function round(value: number) {
  return Math.round(value * 100) / 100;
}

async function readIcon(name: string, prefix: string) {
  const svg = await readFile(resolve("public/icons/vocab", `${name}.svg`), "utf8");
  const match = /^<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>\s*$/.exec(svg);
  if (!match?.[1] || match[2] === undefined) {
    throw new Error(`Icon ${name} is not a single SVG element.`);
  }
  // Prefixed ids keep gradients of different icons apart inside one file.
  const body = match[2]
    .replace(/\bid="([^"]+)"/g, `id="${prefix}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}-$1"`);
  return { viewBox: match[1], body };
}

async function composePicture(picture: LessonPicture) {
  const rows = Math.ceil(picture.cards.length / picture.columns);
  // A title emblem is shown small, so its icons fill the canvas.
  const padding = picture.isDrill ? PADDING : 4;
  const gap = picture.isDrill ? GAP : 8;
  const cardWidth = (picture.width - 2 * padding - (picture.columns - 1) * gap) / picture.columns;
  const cardHeight = (picture.height - 2 * padding - (rows - 1) * gap) / rows;
  const parts: string[] = [];
  for (const [index, icons] of picture.cards.entries()) {
    const x = padding + (index % picture.columns) * (cardWidth + gap);
    const y = padding + Math.floor(index / picture.columns) * (cardHeight + gap);
    let left = x;
    if (picture.isDrill) {
      const badgeX = x + 20 + BADGE_RADIUS;
      const badgeY = y + cardHeight / 2;
      parts.push(
        `<rect x="${round(x)}" y="${round(y)}" width="${round(cardWidth)}" height="${round(cardHeight)}" rx="24" fill="#ffffff" stroke="#e8e4dc" stroke-width="2"/>`,
        `<circle cx="${round(badgeX)}" cy="${round(badgeY)}" r="${BADGE_RADIUS}" fill="#2b4c7e"/>`,
        `<text x="${round(badgeX)}" y="${round(badgeY + 9)}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" text-anchor="middle">${index + 1}</text>`,
      );
      left = x + 20 + 2 * BADGE_RADIUS;
    }
    const inset = picture.isDrill ? 20 : 8;
    const areaWidth = x + cardWidth - inset - (left + inset);
    const size = Math.min(
      cardHeight - 2 * inset,
      (areaWidth - (icons.length - 1) * ICON_GAP) / icons.length,
      160,
    );
    const rowWidth = icons.length * size + (icons.length - 1) * ICON_GAP;
    const startX = left + inset + (areaWidth - rowWidth) / 2;
    for (const [position, name] of icons.entries()) {
      const icon = await readIcon(name, `i${index}-${position}`);
      parts.push(
        `<svg x="${round(startX + position * (size + ICON_GAP))}" y="${round(y + (cardHeight - size) / 2)}" width="${round(size)}" height="${round(size)}" viewBox="${icon.viewBox}">${icon.body}</svg>`,
      );
    }
  }
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${picture.width}" height="${picture.height}" viewBox="0 0 ${picture.width} ${picture.height}">`,
    ...parts,
    "</svg>",
    "",
  ].join("\n");
  if (UNSAFE_MARKUP.test(svg)) {
    throw new Error(`${picture.file} contains markup that is not allowed.`);
  }
  return svg;
}

async function main() {
  const directory = resolve("public/icons/lessons");
  await mkdir(directory, { recursive: true });
  for (const picture of PICTURES) {
    await writeFile(resolve(directory, picture.file), await composePicture(picture));
  }
  console.log(`Wrote ${PICTURES.length} pictures to public/icons/lessons.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
