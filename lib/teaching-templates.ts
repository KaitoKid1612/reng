import type {
  TeachingDraft,
  TeachingDraftContent,
  TeachingSlide,
  TemplateId,
} from "@/lib/teaching-content";

const DIALOGUE_LINES_PER_SLIDE = 3;

interface TemplatePlan {
  examples: boolean;
  sections: readonly ("vocab" | "grammar" | "dialogue")[];
}

const TEMPLATE_PLANS: Record<TemplateId, TemplatePlan> = {
  starter: { examples: true, sections: ["vocab", "grammar", "dialogue"] },
  vocabulary: { examples: true, sections: ["vocab", "grammar", "dialogue"] },
  dialogue: { examples: false, sections: ["vocab", "dialogue", "grammar"] },
  review: { examples: false, sections: ["vocab", "dialogue", "grammar"] },
};

function planSectionSlides(
  section: TemplatePlan["sections"][number],
  content: TeachingDraftContent,
  plan: TemplatePlan,
): TeachingSlide[] {
  if (section === "vocab") {
    return content.vocab.flatMap((item) => [
      { id: `g-vocab-${item.id}`, type: "vocab" as const, refs: [item.id] },
      ...(plan.examples
        ? item.examples.map((_example, index) => ({
            id: `g-example-${item.id}-${index}`,
            type: "examples" as const,
            ref: item.id,
            index,
          }))
        : []),
    ]);
  }
  if (section === "grammar") {
    return content.grammar.map((item) => ({
      id: `g-grammar-${item.id}`,
      type: "grammar" as const,
      ref: item.id,
    }));
  }
  const slides: TeachingSlide[] = [];
  for (let index = 0; index < content.dialogue.length; index += DIALOGUE_LINES_PER_SLIDE) {
    const lines = content.dialogue.slice(index, index + DIALOGUE_LINES_PER_SLIDE);
    slides.push({
      id: `g-dialogue-${lines[0].id}`,
      type: "dialogue",
      refs: lines.map((line) => line.id),
    });
  }
  return slides;
}

// Deterministic: the same draft always yields the same slides and IDs, without AI.
export function planTemplateSlides(draft: TeachingDraft): TeachingSlide[] {
  const { content } = draft;
  const plan = TEMPLATE_PLANS[draft.authoring.templateId];
  const objectives = content.objectives.filter(Boolean);
  return [
    { id: "g-title", type: "title", text: draft.title },
    ...(objectives.length
      ? [
          {
            id: "g-goals",
            type: "note" as const,
            title: "Mục tiêu buổi học",
            body: objectives.join("\n"),
          },
        ]
      : []),
    ...plan.sections.flatMap((section) => planSectionSlides(section, content, plan)),
    ...content.questions.map((question) => ({
      id: `g-quiz-${question.id}`,
      type: "quiz" as const,
      ref: question.id,
    })),
    {
      id: "g-homework",
      type: "note",
      title: "Luyện thêm sau buổi học",
      body: "Ôn lại từ và mẫu câu hôm nay, rồi làm bài tập giáo viên giao trong lớp.",
    },
  ];
}

function withoutNotes(slide: TeachingSlide) {
  const { teacherNotes, ...rest } = slide;
  void teacherNotes;
  return rest;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

// Teacher notes never count as an edit, so they survive regeneration.
export function isSameSlideContent(first: TeachingSlide, second: TeachingSlide) {
  return stableJson(withoutNotes(first)) === stableJson(withoutNotes(second));
}

export interface SlideChanges {
  added: string[];
  updated: string[];
  removed: string[];
  preserved: string[];
}

export interface SlideGeneration {
  slides: TeachingSlide[];
  generatedSlides: TeachingDraft["authoring"]["generatedSlides"];
  changes: SlideChanges;
}

export function hasSlideChanges(changes: SlideChanges) {
  return Boolean(changes.added.length || changes.updated.length || changes.removed.length);
}

// Keeps manual slides, the teacher's order and edited generated slides unless replaceEdited.
// A generated slide the teacher deleted stays deleted unless replaceEdited.
export function generateTeachingSlides(
  draft: TeachingDraft,
  replaceEdited = false,
): SlideGeneration {
  const planned = planTemplateSlides(draft);
  const plannedById = new Map(planned.map((slide) => [slide.id, slide]));
  const previous = draft.authoring.generatedSlides;
  const currentIds = new Set(draft.content.slides.map((slide) => slide.id));
  const result: SlideGeneration = {
    slides: [],
    generatedSlides: {},
    changes: { added: [], updated: [], removed: [], preserved: [] },
  };
  for (const slide of draft.content.slides) {
    const before = previous[slide.id];
    if (!before) {
      result.slides.push(slide);
      continue;
    }
    const next = plannedById.get(slide.id);
    if (!isSameSlideContent(before, slide) && !replaceEdited) {
      result.slides.push(slide);
      result.generatedSlides[slide.id] = next ?? before;
      result.changes.preserved.push(slide.id);
      continue;
    }
    if (!next) {
      result.changes.removed.push(slide.id);
      continue;
    }
    const replacement = slide.teacherNotes ? { ...next, teacherNotes: slide.teacherNotes } : next;
    result.slides.push(replacement);
    result.generatedSlides[next.id] = next;
    if (!isSameSlideContent(next, slide)) {
      result.changes.updated.push(next.id);
    }
  }
  for (const [index, next] of planned.entries()) {
    if (result.slides.some((slide) => slide.id === next.id)) {
      continue;
    }
    if (previous[next.id] && !currentIds.has(next.id) && !replaceEdited) {
      result.generatedSlides[next.id] = next;
      continue;
    }
    let position = 0;
    for (let earlier = index - 1; earlier >= 0; earlier--) {
      const found = result.slides.findIndex((slide) => slide.id === planned[earlier].id);
      if (found >= 0) {
        position = found + 1;
        break;
      }
    }
    result.slides.splice(position, 0, next);
    result.generatedSlides[next.id] = next;
    result.changes.added.push(next.id);
  }
  return result;
}
