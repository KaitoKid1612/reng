/**
 * The learner's course map: the class's teaching lessons as numbered stages, each done, next,
 * open or not yet open, with 0–3 stars for how well the learner answers its practice questions.
 * Review banks, exams and listening sets are not stages; they stay in the review list.
 */

export type StageStatus = "done" | "next" | "open" | "locked";

export interface StageInput {
  lessonId: string;
  courseId: string;
  orderNo: number;
  // The lesson's own number in its course, which question tags use (minna-17 for lesson 17).
  lessonOrder: number;
  isOpen: boolean;
}

export interface TaughtLesson {
  lessonId: string;
  // The class finished the lesson: its last logged session reached the final slide.
  isFinished: boolean;
}

export interface Stage extends StageInput {
  status: StageStatus;
  stars: 0 | 1 | 2 | 3;
  // Answers to the stage's questions in the period, for the "chưa luyện" label.
  answered: number;
}

export interface TaggedAnswer {
  tags: readonly string[];
  isCorrect: boolean;
}

// Minna starters and banks tag every question minna-<lesson>; other courses use <course>-<lesson>.
export function stageTag(courseId: string, lessonOrder: number) {
  return courseId.startsWith("minna-") ? `minna-${lessonOrder}` : `${courseId}-${lessonOrder}`;
}

export const MIN_ANSWERS_FOR_THREE_STARS = 10;

export function countStars(correct: number, answered: number): 0 | 1 | 2 | 3 {
  if (!answered) {
    return 0;
  }
  const rate = correct / answered;
  if (rate >= 0.9 && answered >= MIN_ANSWERS_FOR_THREE_STARS) {
    return 3;
  }
  return rate >= 0.75 ? 2 : 1;
}

export function buildCourseMap(
  stages: readonly StageInput[],
  readLessonIds: ReadonlySet<string>,
  taught: readonly TaughtLesson[],
  answers: readonly TaggedAnswer[],
): Stage[] {
  const ordered = stages.toSorted((first, second) => first.orderNo - second.orderNo);
  // The furthest lesson the class has reached in a logged session: everything before it is done.
  const taughtIds = new Map(taught.map((item) => [item.lessonId, item.isFinished]));
  let reachedIndex = -1;
  let reachedFinished = false;
  ordered.forEach((stage, index) => {
    if (taughtIds.has(stage.lessonId)) {
      reachedIndex = index;
      reachedFinished = taughtIds.get(stage.lessonId) ?? false;
    }
  });
  const tally = new Map<string, { correct: number; answered: number }>();
  for (const answer of answers) {
    for (const tag of new Set(answer.tags)) {
      const entry = tally.get(tag) ?? { correct: 0, answered: 0 };
      entry.answered += 1;
      entry.correct += answer.isCorrect ? 1 : 0;
      tally.set(tag, entry);
    }
  }
  let hasNext = false;
  return ordered.map((stage, index) => {
    const isDone =
      readLessonIds.has(stage.lessonId) ||
      index < reachedIndex ||
      (index === reachedIndex && reachedFinished);
    let status: StageStatus;
    if (isDone) {
      status = "done";
    } else if (!stage.isOpen) {
      status = "locked";
    } else if (!hasNext) {
      status = "next";
      hasNext = true;
    } else {
      status = "open";
    }
    const { correct, answered } = tally.get(stageTag(stage.courseId, stage.lessonOrder)) ?? {
      correct: 0,
      answered: 0,
    };
    return { ...stage, status, stars: countStars(correct, answered), answered };
  });
}
