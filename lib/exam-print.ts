import { toPlainJapanese } from "@/lib/japanese-text";
import { JLPT_SECTION_MINUTES, JLPT_SECTIONS, jlptSectionOf } from "@/lib/jlpt";
import { jlptPartOf } from "@/lib/jlpt-parts";

import type { JlptSection } from "@/lib/jlpt";
import type { JlptExamSet } from "@/lib/jlpt-exam-sets";
import type { LessonQuestion } from "@/lib/lesson-schema";

// The paper booklets of a JLPT exam, A4 portrait like the real test: the learner's questions, an
// answer sheet to fill in, the answer key with Reng's explanations and the listening script. Only
// the key and the script hold answers; the learner's booklet and sheet are built from fields that
// never carry one, so a printout handed to the class cannot give the answers away.
export const PRINT_BOOKLETS = ["questions", "answer-sheet", "answers", "script"] as const;
export type PrintBooklet = (typeof PRINT_BOOKLETS)[number];

export const PRINT_BOOKLET_LABELS: Record<PrintBooklet, string> = {
  questions: "Đề",
  "answer-sheet": "Phiếu trả lời",
  answers: "Đáp án và giải thích",
  script: "Lời thoại nghe",
};

// The booklets a learner may hold; the others are for the teacher.
/** The booklets an exam prints: a test without listening has no listening script. */
export function printBookletsOf(set: JlptExamSet): PrintBooklet[] {
  const hasListening = set.questions.some((question) => question.type === "listen");
  return PRINT_BOOKLETS.filter((booklet) => booklet !== "script" || hasListening);
}

export const LEARNER_BOOKLETS: ReadonlySet<PrintBooklet> = new Set(["questions", "answer-sheet"]);

export function parsePrintBooklet(value: string | undefined): PrintBooklet {
  return PRINT_BOOKLETS.find((booklet) => booklet === value) ?? "questions";
}

// The headings of the real test booklets.
export const PRINT_SECTION_TITLES: Record<JlptSection, string> = {
  vocabulary: "言語知識（文字・語彙）",
  grammarReading: "言語知識（文法）・読解",
  listening: "聴解",
};

export const RENG_EXAM_NOTICE = "Đề thi thử do Reng biên soạn, không phải đề thi thật.";

const FULL_WIDTH_DIGITS = "０１２３４５６７８９";

function fullWidth(value: number) {
  return String(value).replace(/\d/g, (digit) => FULL_WIDTH_DIGITS[Number(digit)]);
}

interface ExamQuestion {
  question: LessonQuestion;
  section: JlptSection;
  // もんだい number within its section, from 1.
  mondai: number;
  // Number printed beside the question: continuous within a language section, per もんだい in
  // listening (1ばん, 2ばん…), as in the real booklets.
  number: number;
  label: string;
}

const MONDAI_TAG = /^(?:mondai|section):(\d+)$/u;

// Questions of one もんだい share this key: the booklet's mondai tag on an official test, the
// listening part tag, or the part of a Reng bank question.
function mondaiKey(question: LessonQuestion) {
  const tag = question.tags.find((item) => MONDAI_TAG.test(item.trim()));
  return tag ?? jlptPartOf(question)?.tag ?? question.instruction ?? "";
}

/** The exam's questions in booklet order with their section, もんだい and printed number. */
export function numberExamQuestions(set: JlptExamSet): ExamQuestion[] {
  const numbered: ExamQuestion[] = [];
  for (const question of set.questions) {
    const section = jlptSectionOf(question);
    if (!section) {
      throw new Error(`${set.id}: ${question.id} belongs to no JLPT section`);
    }
    const previous = numbered.at(-1);
    const sameSection = previous?.section === section;
    const sameMondai = sameSection && mondaiKey(previous.question) === mondaiKey(question);
    let mondai = 1;
    let number = 1;
    if (previous && sameSection) {
      mondai = sameMondai ? previous.mondai : previous.mondai + 1;
      number = section === "listening" && !sameMondai ? 1 : previous.number + 1;
    }
    numbered.push({
      question,
      section,
      mondai,
      number,
      label: section === "listening" ? `${number}ばん` : String(number),
    });
  }
  return numbered;
}

function hasAnswerOptions(question: LessonQuestion): question is LessonQuestion & {
  options: string[];
} {
  return "options" in question && Array.isArray(question.options);
}

// Listening options that are only 1–4 point at the pictures or at answers spoken in the audio.
function printedOptions(question: LessonQuestion) {
  if (!hasAnswerOptions(question)) {
    return [];
  }
  return question.options.every((option) => /^[1-4]$/u.test(option.trim())) ? [] : question.options;
}

// Like the real booklet, short options share one line, middling ones two per line and long ones
// stand one per line, so no option is left alone on a line of its own.
function optionColumns(options: readonly string[]): 1 | 2 | 4 {
  const longest = Math.max(0, ...options.map((option) => toPlainJapanese(option).length));
  if (longest <= 9) {
    return 4;
  }
  return longest <= 20 ? 2 : 1;
}

function optionCount(question: LessonQuestion) {
  return hasAnswerOptions(question) ? question.options.length : 4;
}

const LISTENING_PROMPT_LABEL = /^もんだい\S*\s*\S*ばん$/u;

// A Reng listening prompt starts with its part ("課題理解｜…"); an official one only repeats the
// number ("もんだい１　１ばん"), which the booklet already prints.
function printedPrompt(question: LessonQuestion) {
  const prompt = question.prompt.trim();
  if (question.type !== "listen") {
    return prompt;
  }
  if (LISTENING_PROMPT_LABEL.test(prompt)) {
    return null;
  }
  const bar = prompt.indexOf("｜");
  return bar >= 0 ? prompt.slice(bar + 1).trim() : prompt;
}

function audioOf(question: LessonQuestion) {
  return question.type === "listen" || question.type === "dictation" ? question.audio : null;
}

export interface PrintQuestion {
  key: string;
  label: string;
  prompt: string | null;
  options: string[];
  optionColumns: 1 | 2 | 4;
  optionCount: number;
  image: string | null;
  audio: string | null;
}

export interface PrintBlock {
  passage: string | null;
  image: string | null;
  questions: PrintQuestion[];
}

export interface PrintMondai {
  heading: string;
  instruction: string | null;
  blocks: PrintBlock[];
}

export interface PrintSection<Item> {
  section: JlptSection;
  title: string;
  minutes: number;
  mondai: (Omit<PrintMondai, "blocks"> & { items: Item[] })[];
}

function headingOf(item: ExamQuestion) {
  const part = jlptPartOf(item.question);
  const label = item.section === "listening" && part ? `（${part.label}）` : "";
  return `もんだい${fullWidth(item.mondai)}${label}`;
}

// The もんだい of each section in order, each holding the given view of its questions.
function groupSections<Item>(
  set: JlptExamSet,
  view: (item: ExamQuestion) => Item,
): PrintSection<Item>[] {
  const numbered = numberExamQuestions(set);
  return JLPT_SECTIONS.flatMap((section): PrintSection<Item>[] => {
    const inSection = numbered.filter((item) => item.section === section);
    if (!inSection.length) {
      return [];
    }
    const mondai: PrintSection<Item>["mondai"] = [];
    for (const item of inSection) {
      const last = mondai.at(-1);
      const heading = headingOf(item);
      if (last?.heading === heading) {
        last.items.push(view(item));
      } else {
        mondai.push({
          heading,
          instruction: item.question.instruction ?? null,
          items: [view(item)],
        });
      }
    }
    return [
      {
        section,
        title: PRINT_SECTION_TITLES[section],
        minutes: JLPT_SECTION_MINUTES[set.level][section],
        mondai,
      },
    ];
  });
}

function toPrintQuestion(item: ExamQuestion): PrintQuestion & { passage: string | null } {
  return {
    key: item.question.id,
    label: item.label,
    prompt: printedPrompt(item.question),
    options: printedOptions(item.question),
    optionColumns: optionColumns(printedOptions(item.question)),
    optionCount: optionCount(item.question),
    image: item.question.image ?? null,
    audio: audioOf(item.question),
    passage: item.question.passage ?? null,
  };
}

/**
 * The learner's booklet: each もんだい with its instruction, and its questions in blocks that share
 * a reading passage (printed once, above them). A picture repeated on every question of a passage,
 * such as an information sheet, is printed once with the passage.
 */
export function buildQuestionBooklet(set: JlptExamSet): PrintSection<PrintBlock>[] {
  return groupSections(set, toPrintQuestion).map((section) => ({
    ...section,
    mondai: section.mondai.map((mondai) => {
      const blocks: PrintBlock[] = [];
      for (const { passage, ...question } of mondai.items) {
        const last = blocks.at(-1);
        if (last && passage && last.passage === passage) {
          const repeatsImage = question.image !== null && question.image === last.image;
          last.questions.push(repeatsImage ? { ...question, image: null } : question);
          continue;
        }
        const sharedImage = passage ? question.image : null;
        blocks.push({
          passage,
          image: sharedImage,
          questions: [sharedImage ? { ...question, image: null } : question],
        });
      }
      return { ...mondai, items: blocks };
    }),
  }));
}

export interface AnswerSheetRow {
  key: string;
  label: string;
  optionCount: number;
}

/** The bubble sheet: every question's number and its 1–4 (or 1–3) circles. */
export function buildAnswerSheet(set: JlptExamSet): PrintSection<AnswerSheetRow>[] {
  return groupSections(set, (item) => ({
    key: item.question.id,
    label: item.label,
    optionCount: optionCount(item.question),
  }));
}

export interface AnswerKeyRow {
  key: string;
  label: string;
  // 1-based, as printed on the answer sheet.
  answer: number;
  explain: string;
}

function correctOption(question: LessonQuestion) {
  const [answer] = question.answer;
  if (typeof answer !== "number") {
    throw new Error(`${question.id} has no choice answer`);
  }
  return answer + 1;
}

/** The teacher's key: each question's answer number and Reng's Vietnamese explanation. */
export function buildAnswerKey(set: JlptExamSet): PrintSection<AnswerKeyRow>[] {
  return groupSections(set, (item) => ({
    key: item.question.id,
    label: item.label,
    answer: correctOption(item.question),
    explain: item.question.explain,
  }));
}

export interface ScriptRow {
  key: string;
  label: string;
  transcript: string;
  answer: number;
  audio: string | null;
  // The original recording of the もんだい on jlpt.jp, for an official test.
  originalAudioUrl: string | null;
}

/** The teacher's listening script: every listening question's transcript, answer and audio. */
export function buildListeningScript(set: JlptExamSet): PrintSection<ScriptRow>[] {
  return groupSections(set, (item) => ({
    key: item.question.id,
    label: item.label,
    transcript:
      item.question.type === "listen" || item.question.type === "dictation"
        ? item.question.transcript
        : "",
    answer: correctOption(item.question),
    audio: audioOf(item.question),
    originalAudioUrl: item.question.source?.audioUrl ?? null,
  })).filter((section) => section.section === "listening");
}

/** The time printed on the cover: the sections the exam has and their minutes. */
export function describeExamTime(set: JlptExamSet) {
  const minutes = JLPT_SECTION_MINUTES[set.level];
  const present = new Set(set.questions.map((question) => jlptSectionOf(question)));
  const sections = JLPT_SECTIONS.filter((section) => present.has(section));
  const total = sections.reduce((sum, section) => sum + minutes[section], 0);
  const parts = sections.map(
    (section) => `${PRINT_SECTION_TITLES[section]} ${minutes[section]} phút`,
  );
  return `${total} phút: ${parts.join(" · ")}`;
}

interface PrintAccessClass {
  active: boolean;
  language_tag: string;
}

/**
 * Printing holds the answer key, so only a teacher who owns an active Japanese class opens it
 * (a self-study class counts: its owner is the teacher). Learners never do.
 */
export function canPrintJlptExams(role: string, ownedClasses: readonly PrintAccessClass[]) {
  return (
    role === "teacher" && ownedClasses.some((item) => item.active && item.language_tag === "ja-JP")
  );
}
