import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "@playwright/test";

import type { Page } from "@playwright/test";

// Opens pages of a running Reng server at several widths and reports layout faults that are easy
// to miss by eye: text overlapping other text, words glued together, rows whose items are not
// vertically aligned, controls pressed against text, clipped text, horizontal overflow, text
// touching the screen edge, small tap targets and broken images. Marked screenshots go to the
// output folder with a JSON/Markdown report.
//
//   npm run audit:layout -- --base-url http://127.0.0.1:3017 --crawl 30
//   AUDIT_EMAIL=… AUDIT_PASSWORD=… npm run audit:layout -- --login --crawl 40
//
// Only GET pages are opened and nothing is clicked after signing in, so the audit does not change
// data. Use local or throwaway accounts; credentials are read from the environment only.

type Severity = "error" | "warning";

type IssueKind =
  | "page-overflow"
  | "clipped-text"
  | "text-overlap"
  | "line-overlap"
  | "glued-text"
  | "misaligned-row"
  | "edge-touch"
  | "control-overlap"
  | "tight-spacing"
  | "small-target"
  | "broken-image";

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutIssue {
  kind: IssueKind;
  severity: Severity;
  selector: string;
  text: string;
  detail: string;
  boxes: Box[];
}

interface PageResult {
  url: string;
  width: number;
  status: number;
  issues: LayoutIssue[];
  screenshot: string | null;
}

const GUEST_PATHS = [
  "/",
  "/self-study",
  "/for-teachers",
  "/lessons",
  "/kana",
  "/kana/practice",
  "/grammar",
  "/guide",
  "/sources",
  "/join-class",
  "/sign-in",
  "/sign-up",
  "/sign-up/teacher",
  "/forgot-password",
];
const ACCOUNT_PATHS = ["/", "/classes", "/teach", "/review", "/mistakes", "/progress"];
// Routes that change data on GET, leave the site, stream files or open helper windows.
const SKIPPED_PATH_PATTERN =
  /^\/(api|auth|unsubscribe|_next)\/|\/presenter$|\/sign-out|\.(csv|pdf|png|jpe?g|svg|mp3|txt)$/;
// Segments after these names are record IDs; one page per route shape is enough.
const COLLECTION_SEGMENTS = new Set([
  "lessons",
  "classes",
  "assignments",
  "vocabulary",
  "listening",
  "kanji",
  "history",
  "students",
  "unsubscribe",
]);
const MARK_COLOURS: Record<Severity, string> = { error: "#d1242f", warning: "#bf8700" };

// Runs inside the page. It must not use anything from the surrounding module scope.
function analyzeLayout(): LayoutIssue[] {
  const MAX_PER_KIND = 25;
  const issues: LayoutIssue[] = [];
  const counts = new Map<IssueKind, number>();
  const viewportWidth = document.documentElement.clientWidth;
  const cjkPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
  const wordPattern = /[\p{L}\p{N}]/u;

  function report(issue: LayoutIssue) {
    const count = counts.get(issue.kind) ?? 0;
    if (count < MAX_PER_KIND) {
      issues.push(issue);
    }
    counts.set(issue.kind, count + 1);
  }

  function describe(element: Element) {
    const parts: string[] = [];
    for (
      let current: Element | null = element;
      current && current !== document.body && parts.length < 4;
      current = current.parentElement
    ) {
      if (current.id) {
        parts.unshift(`${current.tagName.toLowerCase()}#${current.id}`);
        break;
      }
      const classes = [...current.classList].slice(0, 2).join(".");
      parts.unshift(
        classes ? `${current.tagName.toLowerCase()}.${classes}` : current.tagName.toLowerCase(),
      );
    }
    return parts.join(" > ");
  }

  function snippet(element: Element) {
    return (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  }

  function toBox(rect: DOMRect): Box {
    return {
      x: rect.left + scrollX,
      y: rect.top + scrollY,
      width: rect.width,
      height: rect.height,
    };
  }

  function isShown(element: Element) {
    return element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  }

  // Screen-reader-only text sits in a 1px clipped box: it is present but never visible.
  const clippedAway = new Map<Element, boolean>();
  function isClippedAway(element: Element | null): boolean {
    if (!element || element === document.body) {
      return false;
    }
    const known = clippedAway.get(element);
    if (known !== undefined) {
      return known;
    }
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const clipsContent = style.overflow !== "visible" || style.clipPath !== "none";
    const result =
      (clipsContent && (rect.width <= 2 || rect.height <= 2)) ||
      isClippedAway(element.parentElement);
    clippedAway.set(element, result);
    return result;
  }

  // Fixed and sticky bars move over the page while scrolling; their text is compared only with
  // text in the same bar.
  const layers = new Map<Element, Element | null>();
  function findLayer(element: Element | null): Element | null {
    if (!element || element === document.body) {
      return null;
    }
    const known = layers.get(element);
    if (known !== undefined) {
      return known;
    }
    const { position } = getComputedStyle(element);
    const result =
      position === "fixed" || position === "sticky" ? element : findLayer(element.parentElement);
    layers.set(element, result);
    return result;
  }

  function isInsideScroller(element: Element) {
    for (
      let current = element.parentElement;
      current && current !== document.body;
      current = current.parentElement
    ) {
      const { overflowX } = getComputedStyle(current);
      if (overflowX === "auto" || overflowX === "scroll") {
        return true;
      }
    }
    return false;
  }

  // Slides are drawn at 1280×720 and scaled down; their spacing is judged at full size.
  function isScaledDown(element: Element) {
    const width = element instanceof HTMLElement ? element.offsetWidth : 0;
    return width > 0 && element.getBoundingClientRect().width / width < 0.95;
  }

  // A control without border, background or shadow looks like plain text, so its text is what
  // sits next to other text; its padding already keeps them apart.
  function visibleBox(element: Element) {
    const style = getComputedStyle(element);
    const isTransparent = (colour: string) => colour === "transparent" || colour.endsWith(", 0)");
    const hasBorder = ["top", "right", "bottom", "left"].some(
      (side) =>
        parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
        !isTransparent(style.getPropertyValue(`border-${side}-color`)),
    );
    if (hasBorder || !isTransparent(style.backgroundColor) || style.boxShadow !== "none") {
      return element.getBoundingClientRect();
    }
    const lines = pieces
      .filter((piece) => element.contains(piece.element))
      .flatMap((piece) => piece.rects);
    if (!lines.length) {
      return element.getBoundingClientRect();
    }
    const left = Math.min(...lines.map((line) => line.left));
    const top = Math.min(...lines.map((line) => line.top));
    const right = Math.max(...lines.map((line) => line.right));
    const bottom = Math.max(...lines.map((line) => line.bottom));
    return new DOMRect(left, top, right - left, bottom - top);
  }

  function verticalOverlap(first: DOMRect, second: DOMRect) {
    return Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
  }

  function horizontalOverlap(first: DOMRect, second: DOMRect) {
    return Math.min(first.right, second.right) - Math.max(first.left, second.left);
  }

  interface TextPiece {
    element: Element;
    text: string;
    rects: DOMRect[];
    layer: Element | null;
  }

  const pieces: TextPiece[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    const element = node.parentElement;
    if (!text.trim() || !element || element.closest("script, style, noscript, template, select")) {
      continue;
    }
    if (!isShown(element) || isClippedAway(element)) {
      continue;
    }
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((rect) => rect.width >= 2 && rect.height >= 2);
    if (rects.length) {
      pieces.push({ element, text, rects, layer: findLayer(element) });
    }
  }

  // Horizontal overflow: report the outermost elements that stick out of the viewport.
  if (document.documentElement.scrollWidth > viewportWidth + 1) {
    const offenders = [...document.body.querySelectorAll("*")].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.right > viewportWidth + 1 && !isInsideScroller(element);
    });
    const outermost = offenders.filter(
      (element) => !offenders.some((other) => other !== element && other.contains(element)),
    );
    for (const element of outermost.slice(0, 5)) {
      const rect = element.getBoundingClientRect();
      report({
        kind: "page-overflow",
        severity: "error",
        selector: describe(element),
        text: snippet(element),
        detail: `right edge ${Math.round(rect.right)}px > viewport ${viewportWidth}px`,
        boxes: [toBox(rect)],
      });
    }
  }

  // Text drawn over other text.
  const lineBoxes = pieces
    .flatMap((piece, index) => piece.rects.map((rect) => ({ rect, index })))
    .sort((first, second) => first.rect.top - second.rect.top);
  const reportedPairs = new Set<string>();
  for (let first = 0; first < lineBoxes.length; first += 1) {
    const current = lineBoxes[first];
    for (let second = first + 1; second < lineBoxes.length; second += 1) {
      const other = lineBoxes[second];
      if (other.rect.top >= current.rect.bottom) {
        break;
      }
      const currentPiece = pieces[current.index];
      const otherPiece = pieces[other.index];
      if (current.index === other.index || currentPiece.layer !== otherPiece.layer) {
        continue;
      }
      // Furigana sits just above its base and may overhang the next character, so an <rt> box
      // always grazes the line box below it. Text it reaches from above still counts.
      const isCurrentRuby = Boolean(currentPiece.element.closest("rt"));
      const isOtherRuby = Boolean(otherPiece.element.closest("rt"));
      if (isCurrentRuby !== isOtherRuby) {
        const [rubyRect, baseRect] = isCurrentRuby
          ? [current.rect, other.rect]
          : [other.rect, current.rect];
        if (rubyRect.top < baseRect.top) {
          continue;
        }
      }
      // A ruby base is centred in a box as wide as its furigana, so that box overhangs the
      // characters beside it by part of the extra width.
      const currentRuby = currentPiece.element.closest("ruby");
      const otherRuby = otherPiece.element.closest("ruby");
      if (currentRuby !== otherRuby) {
        const rubyWidth = currentRuby ? current.rect.width : other.rect.width;
        if (horizontalOverlap(current.rect, other.rect) < rubyWidth / 4) {
          continue;
        }
      }
      const minHeight = Math.min(current.rect.height, other.rect.height);
      const isOverlapping =
        horizontalOverlap(current.rect, other.rect) > 2 &&
        verticalOverlap(current.rect, other.rect) > Math.max(2, minHeight * 0.25);
      const pair = `${current.index}:${other.index}`;
      if (!isOverlapping || reportedPairs.has(pair)) {
        continue;
      }
      reportedPairs.add(pair);
      report({
        kind: "text-overlap",
        severity: "error",
        selector: `${describe(currentPiece.element)}  ×  ${describe(otherPiece.element)}`,
        text: `"${currentPiece.text.trim().slice(0, 40)}" / "${otherPiece.text.trim().slice(0, 40)}"`,
        detail: "two pieces of text are drawn on top of each other",
        boxes: [toBox(current.rect), toBox(other.rect)],
      });
    }
  }

  // Lines of one paragraph crowding each other (line-height too small for the font).
  for (const piece of pieces) {
    const lines = [...piece.rects].sort((first, second) => first.top - second.top);
    const crowded = lines.find(
      (line, index) =>
        index > 0 &&
        line.top > lines[index - 1].top + 1 &&
        line.top < lines[index - 1].bottom - 2 &&
        horizontalOverlap(line, lines[index - 1]) > 0,
    );
    if (crowded) {
      report({
        kind: "line-overlap",
        severity: "warning",
        selector: describe(piece.element),
        text: snippet(piece.element),
        detail: `line-height ${getComputedStyle(piece.element).lineHeight} lets lines touch`,
        boxes: [toBox(crowded)],
      });
    }
  }

  // Words from two elements rendered with no space between them, e.g. "Tên lớpĐã lưu".
  for (let index = 1; index < pieces.length; index += 1) {
    const previous = pieces[index - 1];
    const current = pieces[index];
    const previousChar = previous.text.at(-1) ?? "";
    const currentChar = current.text.at(0) ?? "";
    const isWordJoin =
      wordPattern.test(previousChar) &&
      wordPattern.test(currentChar) &&
      !cjkPattern.test(previousChar) &&
      !cjkPattern.test(currentChar);
    if (!isWordJoin) {
      continue;
    }
    const lastRect = previous.rects[previous.rects.length - 1];
    const firstRect = current.rects[0];
    const gap = firstRect.left - lastRect.right;
    const isSameLine =
      verticalOverlap(lastRect, firstRect) > Math.min(lastRect.height, firstRect.height) * 0.5;
    if (isSameLine && gap > -1 && gap < 2) {
      report({
        kind: "glued-text",
        severity: "warning",
        selector: `${describe(previous.element)}  +  ${describe(current.element)}`,
        text: `"${previous.text.trim().slice(-30)}" + "${current.text.trim().slice(0, 30)}"`,
        detail: "no space between two words from different elements",
        boxes: [toBox(lastRect), toBox(firstRect)],
      });
    }
  }

  // Rows of single-line items (buttons, links, badges) whose text is not vertically aligned.
  function textCentre(element: Element) {
    const piece = pieces.find((item) => element.contains(item.element));
    const rect = piece ? piece.rects[0] : element.getBoundingClientRect();
    return rect.top + rect.height / 2;
  }

  function isSingleLine(element: Element) {
    const rect = element.getBoundingClientRect();
    const lines = pieces
      .filter((item) => element.contains(item.element))
      .flatMap((item) => item.rects);
    return (
      rect.height <= 72 && lines.every((line) => Math.abs(line.top - (lines[0]?.top ?? 0)) < 3)
    );
  }

  for (const container of document.body.querySelectorAll("*")) {
    const style = getComputedStyle(container);
    const isRow =
      (style.display === "flex" || style.display === "inline-flex") &&
      style.flexDirection.startsWith("row") &&
      !style.alignItems.includes("baseline");
    if (!isRow || !isShown(container)) {
      continue;
    }
    const items = [...container.children].filter(
      (child) =>
        isShown(child) &&
        getComputedStyle(child).position !== "absolute" &&
        child.getBoundingClientRect().width > 0,
    );
    if (items.length < 2 || !items.every(isSingleLine)) {
      continue;
    }
    const rows: Element[][] = [];
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      const row = rows.find(
        (candidate) =>
          verticalOverlap(candidate[0].getBoundingClientRect(), rect) > rect.height / 2,
      );
      if (row) {
        row.push(item);
      } else {
        rows.push([item]);
      }
    }
    for (const row of rows.filter((candidate) => candidate.length > 1)) {
      const centres = row.map(textCentre);
      const spread = Math.max(...centres) - Math.min(...centres);
      if (spread > 3) {
        report({
          kind: "misaligned-row",
          severity: "warning",
          selector: describe(container),
          text: row.map((item) => snippet(item).slice(0, 24)).join(" | "),
          detail: `text centres in one row differ by ${Math.round(spread)}px`,
          boxes: row.map((item) => toBox(item.getBoundingClientRect())),
        });
      }
    }
  }

  // Text cut off by a box that hides overflow, and text pressed against the screen edge.
  for (const piece of pieces) {
    for (
      let ancestor: Element | null = piece.element;
      ancestor && ancestor !== document.body;
      ancestor = ancestor.parentElement
    ) {
      const style = getComputedStyle(ancestor);
      const hidesX = style.overflowX === "hidden" || style.overflowX === "clip";
      const hidesY = style.overflowY === "hidden" || style.overflowY === "clip";
      if (!hidesX && !hidesY) {
        continue;
      }
      const box = ancestor.getBoundingClientRect();
      const cut = piece.rects.find(
        (rect) =>
          (hidesX && (rect.left < box.left - 1 || rect.right > box.right + 1)) ||
          (hidesY && (rect.top < box.top - 1 || rect.bottom > box.bottom + 1)),
      );
      if (cut) {
        const isEllipsis = style.textOverflow === "ellipsis";
        report({
          kind: "clipped-text",
          severity: isEllipsis ? "warning" : "error",
          selector: describe(piece.element),
          text: snippet(piece.element),
          detail: isEllipsis ? "shortened with an ellipsis" : `cut off by ${describe(ancestor)}`,
          boxes: [toBox(cut)],
        });
        break;
      }
    }
    const edgeRect = piece.rects.find((rect) => rect.left < 4 || rect.right > viewportWidth - 4);
    if (edgeRect && !piece.layer && !isInsideScroller(piece.element)) {
      report({
        kind: "edge-touch",
        severity: "warning",
        selector: describe(piece.element),
        text: snippet(piece.element),
        detail: "text closer than 4px to the screen edge",
        boxes: [toBox(edgeRect)],
      });
    }
  }

  // Controls: overlapping each other, or smaller than 24×24px (WCAG 2.5.8; inline links excepted).
  const controls = [
    ...document.body.querySelectorAll(
      "a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]",
    ),
  ].filter((element) => isShown(element) && element.getBoundingClientRect().width > 0);
  // WCAG 2.5.8 spacing exception: a 24px circle centred on a small target touches no other target.
  function hasTargetSpacing(control: Element, target: DOMRect) {
    const centreX = target.left + target.width / 2;
    const centreY = target.top + target.height / 2;
    return controls.every((other) => {
      if (other === control || other.contains(control) || control.contains(other)) {
        return true;
      }
      return [...other.getClientRects()].every((rect) => {
        const dx = Math.max(rect.left - centreX, 0, centreX - rect.right);
        const dy = Math.max(rect.top - centreY, 0, centreY - rect.bottom);
        return Math.hypot(dx, dy) >= 12;
      });
    });
  }

  for (const control of controls) {
    const rect = control.getBoundingClientRect();
    const parentText = control.parentElement?.textContent?.trim().length ?? 0;
    const isInlineLink =
      control.tagName === "A" &&
      getComputedStyle(control).display === "inline" &&
      parentText > (control.textContent?.trim().length ?? 0) + 2;
    const label = control.closest("label");
    const target = label && label !== control ? label.getBoundingClientRect() : rect;
    const isUndersized = target.width < 24 || target.height < 24;
    if (
      !isInlineLink &&
      isUndersized &&
      !isScaledDown(control) &&
      !hasTargetSpacing(control, target)
    ) {
      report({
        kind: "small-target",
        severity: "warning",
        selector: describe(control),
        text: snippet(control) || control.getAttribute("aria-label") || "",
        detail: `${Math.round(target.width)}×${Math.round(target.height)}px`,
        boxes: [toBox(rect)],
      });
    }
  }
  for (let first = 0; first < controls.length; first += 1) {
    for (let second = first + 1; second < controls.length; second += 1) {
      const current = controls[first];
      const other = controls[second];
      // A sticky bar covers the page while scrolling by design; compare controls within one layer.
      if (
        current.contains(other) ||
        other.contains(current) ||
        findLayer(current) !== findLayer(other)
      ) {
        continue;
      }
      // Links wrapped over two lines have one box per line; their union would overlap neighbours.
      const currentRect = current.getBoundingClientRect();
      const otherRect = other.getBoundingClientRect();
      const isCovering = [...current.getClientRects()].some((first) =>
        [...other.getClientRects()].some(
          (second) => horizontalOverlap(first, second) > 4 && verticalOverlap(first, second) > 4,
        ),
      );
      if (isCovering) {
        report({
          kind: "control-overlap",
          severity: "error",
          selector: `${describe(current)}  ×  ${describe(other)}`,
          text: `${snippet(current).slice(0, 30)} / ${snippet(other).slice(0, 30)}`,
          detail: "two controls cover each other",
          boxes: [toBox(currentRect), toBox(otherRect)],
        });
      }
    }
  }

  // A button or field pressed against the text above or below it, e.g. a 0px margin.
  for (const control of controls) {
    if (
      (control.tagName === "A" && getComputedStyle(control).display === "inline") ||
      isScaledDown(control)
    ) {
      continue;
    }
    const rect = visibleBox(control);
    const controlLayer = findLayer(control);
    const isTooClose = (line: DOMRect) => {
      const gap = Math.max(line.top - rect.bottom, rect.top - line.bottom);
      return gap > -1 && gap < 4 && horizontalOverlap(line, rect) > 0;
    };
    const neighbour = pieces.find(
      (piece) =>
        piece.layer === controlLayer &&
        !control.contains(piece.element) &&
        !piece.element.contains(control) &&
        piece.rects.some(isTooClose),
    );
    if (neighbour) {
      report({
        kind: "tight-spacing",
        severity: "warning",
        selector: `${describe(control)}  ↔  ${describe(neighbour.element)}`,
        text: `${snippet(control).slice(0, 30)} / ${snippet(neighbour.element).slice(0, 30)}`,
        detail: "less than 4px between a control and the text next to it",
        boxes: [toBox(rect), ...neighbour.rects.filter(isTooClose).map(toBox)],
      });
    }
  }

  for (const image of document.body.querySelectorAll("img")) {
    if (isShown(image) && image.complete && image.naturalWidth === 0) {
      report({
        kind: "broken-image",
        severity: "error",
        selector: describe(image),
        text: image.getAttribute("alt") ?? "",
        detail: `image did not load: ${image.currentSrc || image.src}`,
        boxes: [toBox(image.getBoundingClientRect())],
      });
    }
  }

  return issues;
}

interface MarkRequest {
  issues: LayoutIssue[];
  colours: Record<Severity, string>;
}

// Runs inside the page: outlines each finding so the screenshot shows where to look.
function markIssues({ issues, colours }: MarkRequest) {
  for (const issue of issues) {
    for (const box of issue.boxes) {
      const mark = document.createElement("div");
      mark.dataset.layoutAudit = "";
      Object.assign(mark.style, {
        position: "absolute",
        left: `${box.x - 2}px`,
        top: `${box.y - 2}px`,
        width: `${box.width + 4}px`,
        height: `${box.height + 4}px`,
        outline: `2px solid ${colours[issue.severity]}`,
        pointerEvents: "none",
        zIndex: "2147483647",
      });
      document.body.append(mark);
    }
  }
}

function routeShape(url: URL) {
  const segments = url.pathname.split("/");
  return segments
    .map((segment, index) =>
      COLLECTION_SEGMENTS.has(segments[index - 1] ?? "") ? "[id]" : segment,
    )
    .join("/");
}

function fileSlug(url: URL, width: number) {
  const slug = `${url.pathname}${url.search}`.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `${slug.slice(0, 80) || "home"}-${width}`;
}

async function collectLinks(page: Page, origin: string) {
  const hrefs = await page.$$eval("a[href]", (links) =>
    links.flatMap((link) =>
      link instanceof HTMLAnchorElement && !link.hasAttribute("download") ? [link.href] : [],
    ),
  );
  return hrefs
    .map((href) => new URL(href))
    .filter((url) => url.origin === origin && !SKIPPED_PATH_PATTERN.test(url.pathname))
    .map((url) => {
      url.hash = "";
      return url;
    });
}

async function signIn(page: Page, baseUrl: string) {
  const email = process.env.AUDIT_EMAIL;
  const password = process.env.AUDIT_PASSWORD;
  if (!email || !password) {
    throw new Error("--login needs AUDIT_EMAIL and AUDIT_PASSWORD in the environment.");
  }
  await page.goto(`${baseUrl}/sign-in`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), { timeout: 30_000 });
}

async function auditPage(page: Page, url: URL, width: number, outDir: string): Promise<PageResult> {
  await page.setViewportSize({ width, height: 900 });
  const response = await page.goto(url.toString(), { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  const issues = await page.evaluate(analyzeLayout);
  let screenshot: string | null = null;
  if (issues.length) {
    await page.evaluate(markIssues, { issues, colours: MARK_COLOURS });
    screenshot = path.join(outDir, `${fileSlug(url, width)}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
  }
  return {
    url: `${url.pathname}${url.search}`,
    width,
    status: response?.status() ?? 0,
    issues,
    screenshot,
  };
}

function toMarkdown(results: PageResult[]) {
  const lines = ["# Layout audit", "", `Generated ${new Date().toISOString()}.`, ""];
  for (const result of results.filter((item) => item.issues.length || item.status >= 400)) {
    lines.push(`## ${result.url} @ ${result.width}px (HTTP ${result.status})`, "");
    for (const issue of result.issues) {
      lines.push(
        `- **${issue.severity} ${issue.kind}** \`${issue.selector}\` — ${issue.detail}. ${issue.text}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  const { values } = parseArgs({
    options: {
      "base-url": { type: "string", default: "http://127.0.0.1:3017" },
      widths: { type: "string", default: "360,768,1280" },
      paths: { type: "string" },
      crawl: { type: "string", default: "0" },
      "per-route": { type: "string", default: "1" },
      login: { type: "boolean", default: false },
      out: { type: "string", default: "test-results/layout-audit" },
      strict: { type: "boolean", default: false },
    },
  });
  const baseUrl = values["base-url"].replace(/\/$/, "");
  const origin = new URL(baseUrl).origin;
  const widths = values.widths.split(",").map(Number).filter(Number.isFinite);
  const crawlLimit = Number(values.crawl);
  const perRoute = Math.max(1, Number(values["per-route"]));
  const startPaths = values.paths?.split(",") ?? (values.login ? ACCOUNT_PATHS : GUEST_PATHS);
  const outDir = path.resolve(values.out);
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  // tsx compiles named functions with an esbuild __name() helper that the page does not have.
  await context.addInitScript({ content: "globalThis.__name = (target) => target;" });
  const page = await context.newPage();
  if (values.login) {
    await signIn(page, baseUrl);
  }

  const queue = startPaths.map((item) => new URL(item, baseUrl));
  const seen = new Set<string>();
  const shapes = new Map<string, number>();
  const results: PageResult[] = [];
  const pageLimit = Math.max(startPaths.length, crawlLimit);
  while (queue.length && seen.size < pageLimit) {
    const url = queue.shift();
    if (!url) {
      break;
    }
    const key = `${url.pathname}${url.search}`;
    const shape = routeShape(url);
    if (seen.has(key) || (shapes.get(shape) ?? 0) >= perRoute) {
      continue;
    }
    seen.add(key);
    shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
    for (const width of widths) {
      try {
        const result = await auditPage(page, url, width, outDir);
        results.push(result);
        const errors = result.issues.filter((issue) => issue.severity === "error").length;
        console.log(
          `${key} @${width}: HTTP ${result.status}, ${errors} errors, ${result.issues.length - errors} warnings`,
        );
      } catch (error) {
        console.log(`${key} @${width}: failed (${error instanceof Error ? error.message : error})`);
      }
    }
    if (crawlLimit > 0) {
      queue.push(...(await collectLinks(page, origin)));
    }
  }
  await browser.close();

  await writeFile(path.join(outDir, "report.json"), `${JSON.stringify(results, null, 2)}\n`);
  await writeFile(path.join(outDir, "report.md"), toMarkdown(results));
  const issues = results.flatMap((result) => result.issues);
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  console.log(
    `\n${results.length} page views, ${errorCount} errors, ${issues.length - errorCount} warnings. Report: ${path.join(outDir, "report.md")}`,
  );
  if (errorCount || (values.strict && issues.length)) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Layout audit failed.");
  process.exit(1);
});
