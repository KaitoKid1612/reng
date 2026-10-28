import { createSlide, findReferencingSlides } from "@/lib/lesson-draft";

import type {
  DraftContent,
  DraftGrammar,
  DraftMetadata,
  DraftQuestion,
  DraftSlide,
  DraftVocab,
  LessonDraftState,
  SlideType,
} from "@/lib/lesson-draft";

export interface EditorState {
  draft: LessonDraftState;
  selectedSlideId: string | null;
  changeCount: number;
}

export type EditorAction =
  | { type: "metadata"; patch: Partial<DraftMetadata> }
  | { type: "addVocab"; id: string }
  | { type: "updateVocab"; id: string; patch: Partial<Omit<DraftVocab, "id" | "audio">> }
  | { type: "removeVocab"; id: string }
  | { type: "addGrammar"; id: string }
  | { type: "updateGrammar"; id: string; patch: Partial<Omit<DraftGrammar, "id" | "examples">> }
  | { type: "removeGrammar"; id: string }
  | { type: "addExample"; grammarId: string }
  | { type: "updateExample"; grammarId: string; index: number; patch: { jp?: string; vi?: string } }
  | { type: "removeExample"; grammarId: string; index: number }
  | { type: "addQuestion"; question: DraftQuestion }
  | { type: "updateQuestion"; question: DraftQuestion }
  | { type: "removeQuestion"; id: string }
  | { type: "addSlide"; slideType: SlideType; id: string }
  | { type: "updateSlide"; slide: DraftSlide }
  | { type: "removeSlide"; id: string }
  | { type: "moveSlide"; from: number; to: number }
  | { type: "selectSlide"; id: string }
  | { type: "replace"; draft: LessonDraftState };

export function createEditorState(draft: LessonDraftState): EditorState {
  return { draft, selectedSlideId: draft.content.slides[0]?.id ?? null, changeCount: 0 };
}

function withContent(state: EditorState, content: DraftContent): EditorState {
  return {
    ...state,
    draft: { ...state.draft, content },
    changeCount: state.changeCount + 1,
  };
}

function isReferenced(content: DraftContent, id: string) {
  return findReferencingSlides(content, id).length > 0;
}

export function moveItem<T>(items: readonly T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const { content } = state.draft;
  switch (action.type) {
    case "metadata":
      return {
        ...state,
        draft: { ...state.draft, metadata: { ...state.draft.metadata, ...action.patch } },
        changeCount: state.changeCount + 1,
      };
    case "addVocab":
      return withContent(state, {
        ...content,
        vocab: [...content.vocab, { id: action.id, jp: "", romaji: "", vi: "", audio: null }],
      });
    case "updateVocab":
      return withContent(state, {
        ...content,
        vocab: content.vocab.map((item) => {
          if (item.id !== action.id) {
            return item;
          }
          // Audio hashes are derived from the Japanese text, so edited text needs new audio.
          const isTextChanged = action.patch.jp !== undefined && action.patch.jp !== item.jp;
          return { ...item, ...action.patch, audio: isTextChanged ? null : item.audio };
        }),
      });
    case "removeVocab":
      return isReferenced(content, action.id)
        ? state
        : withContent(state, {
            ...content,
            vocab: content.vocab.filter((item) => item.id !== action.id),
          });
    case "addGrammar":
      return withContent(state, {
        ...content,
        grammar: [
          ...content.grammar,
          {
            id: action.id,
            pattern: "",
            vi: "",
            explain: "",
            examples: [{ jp: "", vi: "", audio: null }],
          },
        ],
      });
    case "updateGrammar":
      return withContent(state, {
        ...content,
        grammar: content.grammar.map((item) =>
          item.id === action.id ? { ...item, ...action.patch } : item,
        ),
      });
    case "removeGrammar":
      return isReferenced(content, action.id)
        ? state
        : withContent(state, {
            ...content,
            grammar: content.grammar.filter((item) => item.id !== action.id),
          });
    case "addExample":
      return withContent(state, {
        ...content,
        grammar: content.grammar.map((item) =>
          item.id === action.grammarId
            ? { ...item, examples: [...item.examples, { jp: "", vi: "", audio: null }] }
            : item,
        ),
      });
    case "updateExample":
      return withContent(state, {
        ...content,
        grammar: content.grammar.map((item) =>
          item.id === action.grammarId
            ? {
                ...item,
                examples: item.examples.map((example, index) => {
                  if (index !== action.index) {
                    return example;
                  }
                  const isTextChanged =
                    action.patch.jp !== undefined && action.patch.jp !== example.jp;
                  return {
                    ...example,
                    ...action.patch,
                    audio: isTextChanged ? null : example.audio,
                  };
                }),
              }
            : item,
        ),
      });
    case "removeExample":
      return withContent(state, {
        ...content,
        grammar: content.grammar.map((item) =>
          item.id === action.grammarId
            ? { ...item, examples: item.examples.filter((_, index) => index !== action.index) }
            : item,
        ),
      });
    case "addQuestion":
      return withContent(state, { ...content, questions: [...content.questions, action.question] });
    case "updateQuestion":
      return withContent(state, {
        ...content,
        questions: content.questions.map((item) =>
          item.id === action.question.id ? action.question : item,
        ),
      });
    case "removeQuestion":
      return isReferenced(content, action.id)
        ? state
        : withContent(state, {
            ...content,
            questions: content.questions.filter((item) => item.id !== action.id),
          });
    case "addSlide": {
      const selectedIndex = content.slides.findIndex((slide) => slide.id === state.selectedSlideId);
      const position = selectedIndex === -1 ? content.slides.length : selectedIndex + 1;
      const slides = [...content.slides];
      slides.splice(position, 0, createSlide(action.slideType, action.id));
      return { ...withContent(state, { ...content, slides }), selectedSlideId: action.id };
    }
    case "updateSlide":
      return withContent(state, {
        ...content,
        slides: content.slides.map((slide) =>
          slide.id === action.slide.id ? action.slide : slide,
        ),
      });
    case "removeSlide": {
      const index = content.slides.findIndex((slide) => slide.id === action.id);
      const slides = content.slides.filter((slide) => slide.id !== action.id);
      const next = slides[Math.min(index, slides.length - 1)]?.id ?? null;
      return { ...withContent(state, { ...content, slides }), selectedSlideId: next };
    }
    case "moveSlide":
      return withContent(state, {
        ...content,
        slides: moveItem(content.slides, action.from, action.to),
      });
    case "selectSlide":
      return { ...state, selectedSlideId: action.id };
    case "replace": {
      const slides = action.draft.content.slides;
      return {
        draft: action.draft,
        selectedSlideId: slides.some((slide) => slide.id === state.selectedSlideId)
          ? state.selectedSlideId
          : (slides[0]?.id ?? null),
        changeCount: state.changeCount + 1,
      };
    }
  }
}
