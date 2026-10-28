import "server-only";

import { z } from "zod";

import {
  describeCorrectAnswer,
  describeRawAnswer,
  hasFeedbackTimeArrived,
  parseAssignableQuestion,
  toQuestionView,
  toStoredRawAnswer,
} from "@/lib/assignment";
import { gradeQuestion } from "@/lib/grading/grade";
import { parseRawAnswer } from "@/lib/grading/raw-answer";
import { loadLessonVersion } from "@/lib/lesson-repository";
import { loadAssignment } from "@/lib/server/assignments";
import {
  callRpc,
  createServiceClient,
  selectOptional,
  selectRows,
  ServiceError,
} from "@/lib/server/supabase";
import {
  createSchedulerState,
  parseSchedulerState,
  ratingForMistake,
  scheduleReview,
  SCHEDULER_VERSION,
  updateMistakeProgress,
} from "@/lib/srs";

import type { QuestionView } from "@/lib/assignment";
import type { LessonContent } from "@/lib/lesson-schema";
import type { ReviewRating } from "@/lib/review-ratings";

const timestamp = z.iso.datetime({ offset: true });
const MAX_SESSION_CARDS = 50;

const cardRowSchema = z.object({
  item_type: z.enum(["vocab", "kanji", "mistake"]),
  source_id: z.string(),
  item_id: z.string(),
  scheduler_version: z.string(),
  scheduler_state: z.unknown(),
  due: timestamp,
  correct_streak: z.number().int(),
  resolved_at: timestamp.nullable(),
  revision: z.number().int(),
});

type CardRow = z.infer<typeof cardRowSchema>;

const CARD_COLUMNS =
  "item_type, source_id, item_id, scheduler_version, scheduler_state, due, correct_streak, resolved_at, revision";

type VocabItem = LessonContent["vocab"][number];

export interface VocabReviewCard {
  kind: "vocab";
  lessonId: string;
  lessonTitle: string;
  vocab: VocabItem;
  revision: number;
}

export interface MistakeReviewCard {
  kind: "mistake";
  assignmentId: string;
  assignmentTitle: string;
  view: QuestionView;
  revision: number;
  correctStreak: number;
}

export type ReviewCard = VocabReviewCard | MistakeReviewCard;

async function loadVocabDecks(lessonIds: readonly string[]) {
  const decks = new Map<string, { title: string; vocab: VocabItem[] }>();
  await Promise.all(
    [...new Set(lessonIds)].map(async (lessonId) => {
      const version = await loadLessonVersion(lessonId);
      if (version) {
        decks.set(lessonId, { title: version.title, vocab: version.content.vocab });
      }
    }),
  );
  return decks;
}

interface MistakeSource {
  assignmentId: string;
  title: string;
  isVisible: boolean;
  feedbackAt: string | null;
  questions: ReturnType<typeof parseAssignableQuestion>[];
}

// Mistakes from tests stay hidden until the assignment's feedback time.
async function loadMistakeSources(assignmentIds: readonly string[], now: Date) {
  const sources = new Map<string, MistakeSource>();
  await Promise.all(
    [...new Set(assignmentIds)].map(async (assignmentId) => {
      const assignment = await loadAssignment(assignmentId).catch(() => null);
      if (!assignment) {
        return;
      }
      const isVisible = hasFeedbackTimeArrived(assignment, now);
      const rows = isVisible
        ? await selectRows(
            createServiceClient()
              .from("assignment_items")
              .select("question_snapshot")
              .eq("assignment_id", assignmentId)
              .order("position"),
            z.object({ question_snapshot: z.unknown() }),
          )
        : [];
      sources.set(assignmentId, {
        assignmentId,
        title: assignment.title,
        isVisible,
        feedbackAt: assignment.feedbackPolicy === "after_due" ? assignment.dueAt : null,
        questions: rows.map((row) => parseAssignableQuestion(row.question_snapshot)),
      });
    }),
  );
  return sources;
}

export async function listDueCards(userId: string, now: Date): Promise<ReviewCard[]> {
  const rows = await selectRows(
    createServiceClient()
      .from("srs_cards")
      .select(CARD_COLUMNS)
      .eq("user_id", userId)
      .in("item_type", ["vocab", "mistake"])
      .is("resolved_at", null)
      .lte("due", now.toISOString())
      .order("due")
      .limit(200),
    cardRowSchema,
  );
  const decks = await loadVocabDecks(
    rows.filter((row) => row.item_type === "vocab").map((row) => row.source_id),
  );
  const sources = await loadMistakeSources(
    rows.filter((row) => row.item_type === "mistake").map((row) => row.source_id),
    now,
  );
  const cards: ReviewCard[] = [];
  for (const row of rows) {
    if (row.item_type === "vocab") {
      const deck = decks.get(row.source_id);
      const vocab = deck?.vocab.find((item) => item.id === row.item_id);
      if (deck && vocab) {
        cards.push({
          kind: "vocab",
          lessonId: row.source_id,
          lessonTitle: deck.title,
          vocab,
          revision: row.revision,
        });
      }
      continue;
    }
    const source = sources.get(row.source_id);
    const question = source?.questions.find((item) => item.id === row.item_id);
    if (source?.isVisible && question) {
      cards.push({
        kind: "mistake",
        assignmentId: source.assignmentId,
        assignmentTitle: source.title,
        view: toQuestionView(question),
        revision: row.revision,
        correctStreak: row.correct_streak,
      });
    }
  }
  return cards.slice(0, MAX_SESSION_CARDS);
}

async function loadCard(userId: string, itemType: string, sourceId: string, itemId: string) {
  return selectOptional(
    createServiceClient()
      .from("srs_cards")
      .select(CARD_COLUMNS)
      .eq("user_id", userId)
      .eq("item_type", itemType)
      .eq("source_id", sourceId)
      .eq("item_id", itemId)
      .maybeSingle(),
    cardRowSchema,
  );
}

const reviewResultSchema = z
  .array(
    z.object({
      status: z.enum(["recorded", "duplicate", "conflict", "not_found"]),
      revision: z.number().int().nullable(),
    }),
  )
  .length(1)
  .transform((rows) => rows[0]);

interface ReviewWrite {
  userId: string;
  itemType: "vocab" | "mistake";
  sourceId: string;
  itemId: string;
  requestId: string;
  expectedRevision: number | null;
  rating: ReviewRating;
  isCorrect: boolean | null;
  state: ReturnType<typeof createSchedulerState>;
  correctStreak: number;
  isResolved: boolean;
}

async function writeReview(write: ReviewWrite) {
  const result = await callRpc(
    "record_review",
    {
      p_user_id: write.userId,
      p_item_type: write.itemType,
      p_source_id: write.sourceId,
      p_item_id: write.itemId,
      p_request_id: write.requestId,
      p_expected_revision: write.expectedRevision,
      p_rating: write.rating,
      p_is_correct: write.isCorrect,
      p_state: write.state,
      p_due: write.state.due,
      p_correct_streak: write.correctStreak,
      p_resolved: write.isResolved,
      p_scheduler_version: SCHEDULER_VERSION,
    },
    reviewResultSchema,
  );
  if (result.status === "conflict" || result.status === "not_found") {
    throw new ServiceError(result.status);
  }
  return result;
}

// Retries reuse their request ID; recognizing them first keeps a lost response from
// turning into a conflict or a second scheduling step.
async function isRecordedRequest(userId: string, requestId: string) {
  const row = await selectOptional(
    createServiceClient()
      .from("review_events")
      .select("id")
      .eq("user_id", userId)
      .eq("request_id", requestId)
      .maybeSingle(),
    z.object({ id: z.uuid() }),
  );
  return row !== null;
}

function currentState(card: CardRow | null, now: Date) {
  return card
    ? parseSchedulerState(card.scheduler_version, card.scheduler_state)
    : createSchedulerState(now);
}

export interface VocabReviewInput {
  lessonId: string;
  vocabId: string;
  rating: ReviewRating;
  requestId: string;
  revision: number | null;
}

export async function recordVocabReview(userId: string, input: VocabReviewInput, now: Date) {
  const version = await loadLessonVersion(input.lessonId);
  if (!version?.content.vocab.some((item) => item.id === input.vocabId)) {
    throw new ServiceError("not_found");
  }
  const card = await loadCard(userId, "vocab", input.lessonId, input.vocabId);
  if (card && (await isRecordedRequest(userId, input.requestId))) {
    return { revision: card.revision, due: card.due };
  }
  if ((card?.revision ?? null) !== input.revision) {
    throw new ServiceError("conflict");
  }
  const state = scheduleReview(currentState(card, now), input.rating, now);
  const result = await writeReview({
    userId,
    itemType: "vocab",
    sourceId: input.lessonId,
    itemId: input.vocabId,
    requestId: input.requestId,
    expectedRevision: input.revision,
    rating: input.rating,
    isCorrect: null,
    state,
    correctStreak: 0,
    isResolved: false,
  });
  return { revision: result.revision, due: state.due };
}

export interface MistakeReviewInput {
  assignmentId: string;
  questionId: string;
  answer: unknown;
  requestId: string;
  revision: number;
}

export async function recordMistakeReview(userId: string, input: MistakeReviewInput, now: Date) {
  const card = await loadCard(userId, "mistake", input.assignmentId, input.questionId);
  if (!card) {
    throw new ServiceError("not_found");
  }
  const sources = await loadMistakeSources([input.assignmentId], now);
  const question = sources
    .get(input.assignmentId)
    ?.questions.find((item) => item.id === input.questionId);
  if (!question) {
    throw new ServiceError("not_found");
  }
  let raw;
  try {
    raw = parseRawAnswer(question, input.answer);
  } catch {
    throw new ServiceError("invalid_answer");
  }
  const { isCorrect } = gradeQuestion(question, raw);
  const outcome = {
    isCorrect,
    correctText: describeCorrectAnswer(question),
    explain: question.explain,
  };
  if (await isRecordedRequest(userId, input.requestId)) {
    return {
      ...outcome,
      correctStreak: card.correct_streak,
      isResolved: card.resolved_at !== null,
    };
  }
  if (card.revision !== input.revision) {
    throw new ServiceError("conflict");
  }
  if (card.resolved_at || Date.parse(card.due) > now.getTime()) {
    throw new ServiceError("not_due");
  }
  const progress = updateMistakeProgress(card.correct_streak, isCorrect);
  const state = scheduleReview(currentState(card, now), ratingForMistake(isCorrect), now);
  await writeReview({
    userId,
    itemType: "mistake",
    sourceId: input.assignmentId,
    itemId: input.questionId,
    requestId: input.requestId,
    expectedRevision: input.revision,
    rating: ratingForMistake(isCorrect),
    isCorrect,
    state,
    correctStreak: progress.correctStreak,
    isResolved: progress.isResolved,
  });
  return { ...outcome, correctStreak: progress.correctStreak, isResolved: progress.isResolved };
}

export interface MistakeEntry {
  assignmentId: string;
  assignmentTitle: string;
  view: QuestionView;
  correctText: string;
  explain: string;
  lastAnswerText: string;
  correctStreak: number;
  resolvedAt: string | null;
  due: string;
}

export interface MistakeBook {
  entries: MistakeEntry[];
  hidden: { assignmentTitle: string; count: number; feedbackAt: string | null }[];
}

export async function listMistakes(userId: string, now: Date): Promise<MistakeBook> {
  const service = createServiceClient();
  const cards = await selectRows(
    service
      .from("srs_cards")
      .select(CARD_COLUMNS)
      .eq("user_id", userId)
      .eq("item_type", "mistake")
      .order("updated_at", { ascending: false })
      .limit(500),
    cardRowSchema,
  );
  const sources = await loadMistakeSources(
    cards.map((card) => card.source_id),
    now,
  );
  const visibleIds = [...sources.values()]
    .filter((source) => source.isVisible)
    .map((source) => source.assignmentId);
  const submissions = visibleIds.length
    ? await selectRows(
        service
          .from("submissions")
          .select("id, assignment_id, attempt_no")
          .eq("user_id", userId)
          .eq("status", "submitted")
          .in("assignment_id", visibleIds)
          .order("attempt_no", { ascending: false }),
        z.object({ id: z.uuid(), assignment_id: z.uuid(), attempt_no: z.number().int() }),
      )
    : [];
  const answers = submissions.length
    ? await selectRows(
        service
          .from("answers")
          .select("submission_id, question_id, raw, is_correct")
          .in(
            "submission_id",
            submissions.map((submission) => submission.id),
          )
          .eq("is_correct", false),
        z.object({
          submission_id: z.uuid(),
          question_id: z.string(),
          raw: z.unknown(),
          is_correct: z.boolean(),
        }),
      )
    : [];
  const entries: MistakeEntry[] = [];
  const hidden = new Map<string, MistakeBook["hidden"][number]>();
  for (const card of cards) {
    const source = sources.get(card.source_id);
    if (!source) {
      continue;
    }
    if (!source.isVisible) {
      const current = hidden.get(source.assignmentId);
      hidden.set(source.assignmentId, {
        assignmentTitle: source.title,
        count: (current?.count ?? 0) + 1,
        feedbackAt: source.feedbackAt,
      });
      continue;
    }
    const question = source.questions.find((item) => item.id === card.item_id);
    if (!question) {
      continue;
    }
    // Latest wrong answer: submissions are ordered from the newest attempt.
    const lastWrong = submissions
      .filter((submission) => submission.assignment_id === source.assignmentId)
      .map((submission) =>
        answers.find(
          (answer) => answer.submission_id === submission.id && answer.question_id === question.id,
        ),
      )
      .find((answer) => answer !== undefined);
    entries.push({
      assignmentId: source.assignmentId,
      assignmentTitle: source.title,
      view: toQuestionView(question),
      correctText: describeCorrectAnswer(question),
      explain: question.explain,
      lastAnswerText: describeRawAnswer(question, toStoredRawAnswer(lastWrong?.raw)),
      correctStreak: card.correct_streak,
      resolvedAt: card.resolved_at,
      due: card.due,
    });
  }
  return { entries, hidden: [...hidden.values()] };
}

export interface VocabDeckCard {
  vocab: VocabItem;
  revision: number | null;
  due: string | null;
}

export async function getVocabularyDeck(userId: string | null, lessonId: string) {
  const version = await loadLessonVersion(lessonId);
  if (!version) {
    return null;
  }
  const cards = userId
    ? await selectRows(
        createServiceClient()
          .from("srs_cards")
          .select(CARD_COLUMNS)
          .eq("user_id", userId)
          .eq("item_type", "vocab")
          .eq("source_id", lessonId),
        cardRowSchema,
      )
    : [];
  return {
    lessonId,
    versionId: version.id,
    title: version.title,
    titleJa: version.titleJa,
    isSample: version.isSample,
    cards: version.content.vocab.map((vocab): VocabDeckCard => {
      const card = cards.find((item) => item.item_id === vocab.id);
      return { vocab, revision: card?.revision ?? null, due: card?.due ?? null };
    }),
  };
}
