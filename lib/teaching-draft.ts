import { createTeachingContext } from "@/lib/teaching-content";
import { isSameSlideContent } from "@/lib/teaching-templates";

import type {
  AuthoringState,
  ChineseLanguageTag,
  PublicTeachingLesson,
  TeachingDialogueLine,
  TeachingDraft,
  TeachingDraftContent,
  TeachingDraftQuestion,
  TeachingExample,
  TeachingGrammar,
  TeachingSlide,
  TeachingVocab,
  TemplateId,
} from "@/lib/teaching-content";
import type { SlideGeneration } from "@/lib/teaching-templates";
import type { TableRow } from "@/lib/teaching-table";

// Characters, not bytes: Chinese text takes three UTF-8 bytes against the 1 MB action body limit.
export const MAX_DRAFT_JSON_LENGTH = 200_000;

type ItemCollection = "vocab" | "grammar" | "dialogue" | "questions" | "slides";

export function createTeachingId(prefix: string, content: TeachingDraftContent) {
  const used = new Set(
    [
      ...content.vocab,
      ...content.grammar,
      ...content.dialogue,
      ...content.questions,
      ...content.slides,
    ].map((item) => item.id),
  );
  let number = 1;
  while (used.has(`${prefix}-${number}`)) {
    number++;
  }
  return `${prefix}-${number}`;
}

const EMPTY_EXAMPLE: TeachingExample = { text: "", reading: "", meaning: "" };

export type TeachingAction =
  | { type: "replace"; draft: TeachingDraft }
  | { type: "setTitle"; title: string }
  | { type: "setOrder"; order: number }
  | { type: "setTemplate"; templateId: TemplateId }
  | { type: "setLanguage"; languageTag: ChineseLanguageTag }
  | { type: "setAuthoring"; patch: Partial<Omit<AuthoringState, "generatedSlides">> }
  | { type: "setObjectives"; objectives: string[] }
  | { type: "addVocab" }
  | { type: "addVocabRows"; rows: readonly TableRow[] }
  | { type: "updateVocab"; id: string; patch: Partial<Omit<TeachingVocab, "id" | "examples">> }
  | { type: "addExample"; collection: "vocab" | "grammar"; id: string }
  | {
      type: "updateExample";
      collection: "vocab" | "grammar";
      id: string;
      index: number;
      patch: Partial<TeachingExample>;
    }
  | { type: "removeExample"; collection: "vocab" | "grammar"; id: string; index: number }
  | { type: "addGrammar" }
  | {
      type: "updateGrammar";
      id: string;
      patch: Partial<Omit<TeachingGrammar, "id" | "examples">>;
    }
  | { type: "addDialogue" }
  | { type: "updateDialogue"; id: string; patch: Partial<Omit<TeachingDialogueLine, "id">> }
  | { type: "addQuestion"; question: TeachingDraftQuestion }
  | { type: "updateQuestion"; question: TeachingDraftQuestion }
  | { type: "applySlides"; generation: SlideGeneration }
  | { type: "addNoteSlide" }
  | { type: "updateSlide"; slide: TeachingSlide }
  | { type: "removeItem"; collection: ItemCollection; id: string }
  | { type: "moveItem"; collection: ItemCollection; id: string; offset: -1 | 1 };

export type TeachingDispatch = (action: TeachingAction) => void;

// Narrows a <select> value to the allowed options without a type assertion.
export function pickOption<Option extends string>(options: readonly Option[], value: string) {
  return options.find((option) => option === value);
}

function withContent(draft: TeachingDraft, patch: Partial<TeachingDraftContent>): TeachingDraft {
  return { ...draft, content: { ...draft.content, ...patch } };
}

function updateById<T extends { id: string }>(
  items: readonly T[],
  id: string,
  patch: Partial<NoInfer<T>>,
) {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

function moveById<T extends { id: string }>(items: readonly T[], id: string, offset: -1 | 1) {
  const index = items.findIndex((item) => item.id === id);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= items.length) {
    return [...items];
  }
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function updateExamples(
  draft: TeachingDraft,
  collection: "vocab" | "grammar",
  id: string,
  change: (examples: TeachingExample[]) => TeachingExample[],
) {
  if (collection === "vocab") {
    return withContent(draft, {
      vocab: draft.content.vocab.map((item) =>
        item.id === id ? { ...item, examples: change(item.examples) } : item,
      ),
    });
  }
  return withContent(draft, {
    grammar: draft.content.grammar.map((item) =>
      item.id === id ? { ...item, examples: change(item.examples) } : item,
    ),
  });
}

function removeItem(draft: TeachingDraft, collection: ItemCollection, id: string) {
  const { content } = draft;
  switch (collection) {
    case "vocab":
      return withContent(draft, { vocab: content.vocab.filter((item) => item.id !== id) });
    case "grammar":
      return withContent(draft, { grammar: content.grammar.filter((item) => item.id !== id) });
    case "dialogue":
      return withContent(draft, { dialogue: content.dialogue.filter((item) => item.id !== id) });
    case "questions":
      return withContent(draft, {
        questions: content.questions.filter((item) => item.id !== id),
      });
    case "slides":
      return withContent(draft, { slides: content.slides.filter((item) => item.id !== id) });
  }
}

function moveItem(draft: TeachingDraft, collection: ItemCollection, id: string, offset: -1 | 1) {
  const { content } = draft;
  switch (collection) {
    case "vocab":
      return withContent(draft, { vocab: moveById(content.vocab, id, offset) });
    case "grammar":
      return withContent(draft, { grammar: moveById(content.grammar, id, offset) });
    case "dialogue":
      return withContent(draft, { dialogue: moveById(content.dialogue, id, offset) });
    case "questions":
      return withContent(draft, { questions: moveById(content.questions, id, offset) });
    case "slides":
      return withContent(draft, { slides: moveById(content.slides, id, offset) });
  }
}

function addVocabRows(draft: TeachingDraft, rows: readonly TableRow[]) {
  let content = draft.content;
  for (const row of rows.filter((item) => item.status === "valid")) {
    const vocab: TeachingVocab = {
      id: createTeachingId("vocab", content),
      text: row.text,
      reading: row.reading,
      meaning: row.meaning,
      examples: row.example ? [row.example] : [],
      audio: null,
    };
    content = { ...content, vocab: [...content.vocab, vocab] };
  }
  return { ...draft, content };
}

export function teachingReducer(draft: TeachingDraft, action: TeachingAction): TeachingDraft {
  const { content } = draft;
  switch (action.type) {
    case "replace":
      return action.draft;
    case "setTitle":
      return { ...draft, title: action.title };
    case "setOrder":
      return { ...draft, order: action.order };
    case "setTemplate":
      return { ...draft, authoring: { ...draft.authoring, templateId: action.templateId } };
    case "setLanguage":
      return withContent(draft, { context: createTeachingContext(action.languageTag) });
    case "setAuthoring":
      return { ...draft, authoring: { ...draft.authoring, ...action.patch } };
    case "setObjectives":
      return withContent(draft, { objectives: action.objectives });
    case "addVocab":
      return withContent(draft, {
        vocab: [
          ...content.vocab,
          {
            id: createTeachingId("vocab", content),
            text: "",
            reading: "",
            meaning: "",
            examples: [],
            audio: null,
          },
        ],
      });
    case "addVocabRows":
      return addVocabRows(draft, action.rows);
    case "updateVocab":
      return withContent(draft, { vocab: updateById(content.vocab, action.id, action.patch) });
    case "addExample":
      return updateExamples(draft, action.collection, action.id, (examples) => [
        ...examples,
        EMPTY_EXAMPLE,
      ]);
    case "updateExample":
      return updateExamples(draft, action.collection, action.id, (examples) =>
        examples.map((example, index) =>
          index === action.index ? { ...example, ...action.patch } : example,
        ),
      );
    case "removeExample":
      return updateExamples(draft, action.collection, action.id, (examples) =>
        examples.filter((_example, index) => index !== action.index),
      );
    case "addGrammar":
      return withContent(draft, {
        grammar: [
          ...content.grammar,
          {
            id: createTeachingId("grammar", content),
            pattern: "",
            meaning: "",
            explain: "",
            examples: [],
          },
        ],
      });
    case "updateGrammar":
      return withContent(draft, { grammar: updateById(content.grammar, action.id, action.patch) });
    case "addDialogue":
      return withContent(draft, {
        dialogue: [
          ...content.dialogue,
          {
            id: createTeachingId("line", content),
            speaker: "",
            text: "",
            reading: "",
            meaning: "",
            audio: null,
          },
        ],
      });
    case "updateDialogue":
      return withContent(draft, {
        dialogue: updateById(content.dialogue, action.id, action.patch),
      });
    case "addQuestion":
      return withContent(draft, { questions: [...content.questions, action.question] });
    case "updateQuestion":
      return withContent(draft, {
        questions: content.questions.map((item) =>
          item.id === action.question.id ? action.question : item,
        ),
      });
    case "applySlides":
      return {
        ...draft,
        content: { ...content, slides: action.generation.slides },
        authoring: { ...draft.authoring, generatedSlides: action.generation.generatedSlides },
      };
    case "addNoteSlide":
      return withContent(draft, {
        slides: [
          ...content.slides,
          { id: createTeachingId("note", content), type: "note", title: "", body: "" },
        ],
      });
    case "updateSlide":
      return withContent(draft, {
        slides: content.slides.map((slide) =>
          slide.id === action.slide.id ? action.slide : slide,
        ),
      });
    case "removeItem":
      return removeItem(draft, action.collection, action.id);
    case "moveItem":
      return moveItem(draft, action.collection, action.id, action.offset);
  }
}

export function createBlankQuestion(
  content: TeachingDraftContent,
  type: "choice" | "fill",
): TeachingDraftQuestion {
  const base = {
    id: createTeachingId("question", content),
    prompt: "",
    explain: "",
    points: 1,
    tags: [],
    gradingProfile: "zh-exact-v1" as const,
  };
  return type === "choice"
    ? { ...base, type, options: ["", ""], multiple: false, answer: [] }
    : { ...base, type, inputMode: "chinese", kanjiStrict: false, answer: [""] };
}

function describeWord(item: TeachingVocab) {
  return item.reading ? `${item.text} (${item.reading})` : item.text;
}

export type QuestionKind = "meaning" | "hanzi" | "pinyin";

export const QUESTION_KIND_LABELS: Record<QuestionKind, string> = {
  meaning: "Chọn nghĩa đúng",
  hanzi: "Viết chữ Hán theo nghĩa",
  pinyin: "Viết pinyin có dấu thanh",
};

// Builds an editable question frame from a word; the teacher still confirms every answer.
export function buildVocabularyQuestion(
  content: TeachingDraftContent,
  vocabId: string,
  kind: QuestionKind,
): TeachingDraftQuestion | null {
  const item = content.vocab.find((entry) => entry.id === vocabId);
  if (!item?.text || !item.meaning || (kind === "pinyin" && !item.reading)) {
    return null;
  }
  const base = {
    id: createTeachingId("question", content),
    points: 1,
    tags: ["Từ vựng"],
    gradingProfile: "zh-exact-v1" as const,
  };
  if (kind === "meaning") {
    const distractors = [
      ...new Set(
        content.vocab
          .filter(
            (entry) => entry.id !== item.id && entry.meaning && entry.meaning !== item.meaning,
          )
          .map((entry) => entry.meaning),
      ),
    ].slice(0, 3);
    const options = [...distractors];
    const answerIndex = content.vocab.indexOf(item) % (distractors.length + 1);
    options.splice(answerIndex, 0, item.meaning);
    return {
      ...base,
      type: "choice",
      prompt: `${describeWord(item)} nghĩa là gì?`,
      options: options.length >= 2 ? options : [item.meaning, ""],
      multiple: false,
      answer: [answerIndex],
      explain: `${describeWord(item)} nghĩa là “${item.meaning}”.`,
    };
  }
  if (kind === "hanzi") {
    return {
      ...base,
      type: "fill",
      prompt: item.reading
        ? `Viết chữ Hán của “${item.meaning}” (${item.reading}).`
        : `Viết chữ Hán của “${item.meaning}”.`,
      inputMode: "chinese",
      kanjiStrict: false,
      answer: [item.text],
      explain: `“${item.meaning}” viết là ${describeWord(item)}.`,
    };
  }
  return {
    ...base,
    type: "fill",
    prompt: `Viết pinyin có dấu thanh của ${item.text}.`,
    inputMode: "pinyin",
    kanjiStrict: false,
    answer: [item.reading],
    explain: `${item.text} đọc là ${item.reading}, nghĩa là “${item.meaning}”.`,
  };
}

function stableQuestionJson(question: TeachingDraftQuestion) {
  return JSON.stringify(question, Object.keys(question).sort());
}

export type ReviewedQuestions = ReadonlyMap<string, string>;

// The server decides which saved questions are reviewed; any local edit invalidates it.
export function createReviewedQuestions(
  draft: TeachingDraft,
  reviewedIds: readonly string[],
): ReviewedQuestions {
  return new Map(
    draft.content.questions
      .filter((question) => reviewedIds.includes(question.id))
      .map((question) => [question.id, stableQuestionJson(question)]),
  );
}

export function isQuestionReviewed(question: TeachingDraftQuestion, reviewed: ReviewedQuestions) {
  return reviewed.get(question.id) === stableQuestionJson(question);
}

export function countEditedGeneratedSlides(draft: TeachingDraft) {
  return draft.content.slides.filter((slide) => {
    const generated = draft.authoring.generatedSlides[slide.id];
    return generated && !isSameSlideContent(generated, slide);
  }).length;
}

// Learner-facing preview built from the unsaved draft; teacher notes and answers are excluded.
export function toPreviewLesson(draft: TeachingDraft, lessonId: string): PublicTeachingLesson {
  const { content } = draft;
  return {
    id: "00000000-0000-4000-8000-000000000000",
    lessonId,
    versionNo: 1,
    publishedAt: new Date(0).toISOString(),
    title: draft.title,
    summary: content.objectives.join("; "),
    order: draft.order,
    courseId: "chinese",
    isSample: false,
    content: {
      schemaVersion: 2,
      context: content.context,
      objectives: content.objectives,
      vocab: content.vocab,
      grammar: content.grammar,
      dialogue: content.dialogue,
      slides: content.slides.map(({ teacherNotes, ...slide }) => {
        void teacherNotes;
        return slide;
      }),
      questions: content.questions.map((question) => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        points: question.points,
        tags: question.tags,
        options: question.type === "choice" ? question.options : undefined,
      })),
    },
  };
}
