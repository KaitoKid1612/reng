import "server-only";

import { z } from "zod";

import {
  countLiveChoices,
  LIVE_PHASES,
  liveQuestionSchema,
  pickLiveQuestions,
  rankLivePlayers,
} from "@/lib/live-quiz";
import { loadPinnedLessonQuestions } from "@/lib/server/assignments";
import { getTeacherClass } from "@/lib/server/classes";
import {
  callRpc,
  createServiceClient,
  selectEveryPage,
  selectOptional,
  selectRows,
  selectRowsIn,
  ServiceError,
} from "@/lib/server/supabase";
import { absoluteUrl } from "@/lib/site";

import type { LiveAction, LiveAnswerRow, LivePhase, LivePlayerRow } from "@/lib/live-quiz";

const timestamp = z.iso.datetime({ offset: true });
const TOP_STANDINGS = 10;

const quizRowSchema = z.object({
  id: z.uuid(),
  class_id: z.uuid(),
  lesson_id: z.string(),
  teacher_id: z.uuid(),
  questions: z.array(liveQuestionSchema),
  seconds_per_question: z.number().int(),
  phase: z.enum(LIVE_PHASES),
  current_index: z.number().int(),
  question_started_at: timestamp.nullable(),
  revision: z.number().int(),
});
type QuizRow = z.infer<typeof quizRowSchema>;
const QUIZ_COLUMNS =
  "id, class_id, lesson_id, teacher_id, questions, seconds_per_question, phase, current_index, question_started_at, revision";

async function loadQuiz(quizId: string, teacherId?: string) {
  if (!z.uuid().safeParse(quizId).success) {
    throw new ServiceError("not_found");
  }
  let query = createServiceClient().from("live_quizzes").select(QUIZ_COLUMNS).eq("id", quizId);
  if (teacherId) {
    query = query.eq("teacher_id", teacherId);
  }
  const row = await selectOptional(query.maybeSingle(), quizRowSchema);
  if (!row) {
    throw new ServiceError("not_found");
  }
  return row;
}

async function loadPlayers(quizId: string): Promise<LivePlayerRow[]> {
  const rows = await selectRows(
    createServiceClient()
      .from("live_quiz_players")
      .select("user_id, joined_at")
      .eq("quiz_id", quizId)
      .order("joined_at"),
    z.object({ user_id: z.uuid(), joined_at: timestamp }),
  );
  const names = await selectRowsIn(
    rows.map((row) => row.user_id),
    (chunk) => createServiceClient().from("profiles").select("id, full_name").in("id", chunk),
    z.object({ id: z.uuid(), full_name: z.string() }),
  );
  return rows.map((row) => ({
    userId: row.user_id,
    name: names.find((profile) => profile.id === row.user_id)?.full_name || "Học viên",
    joinedAt: row.joined_at,
  }));
}

async function loadAnswers(quizId: string): Promise<LiveAnswerRow[]> {
  const rows = await selectEveryPage(
    (from, to) =>
      createServiceClient()
        .from("live_quiz_answers")
        .select("user_id, question_index, choice, is_correct, points")
        .eq("quiz_id", quizId)
        .order("question_index")
        .order("user_id")
        .range(from, to),
    z.object({
      user_id: z.uuid(),
      question_index: z.number().int(),
      choice: z.number().int(),
      is_correct: z.boolean(),
      points: z.number().int(),
    }),
  );
  return rows.map((row) => ({
    userId: row.user_id,
    questionIndex: row.question_index,
    choice: row.choice,
    isCorrect: row.is_correct,
    points: row.points,
  }));
}

async function loadClassLanguage(classId: string) {
  const row = await selectOptional(
    createServiceClient().from("classes").select("language_tag").eq("id", classId).maybeSingle(),
    z.object({ language_tag: z.string() }),
  );
  return row?.language_tag ?? "ja-JP";
}

// The clock both screens count down from: when the question opened and how long it stays open.
function timing(quiz: QuizRow) {
  return {
    seconds: quiz.seconds_per_question,
    startedAt:
      quiz.phase === "question" || quiz.phase === "reveal" ? quiz.question_started_at : null,
    serverNow: new Date().toISOString(),
  };
}

// The question as phones and the shared screen show it; the key only once it is revealed.
function currentQuestion(quiz: QuizRow) {
  const question = quiz.questions[quiz.current_index];
  if (!question || (quiz.phase !== "question" && quiz.phase !== "reveal")) {
    return null;
  }
  const isRevealed = quiz.phase === "reveal";
  return {
    instruction: question.instruction ?? null,
    prompt: question.prompt,
    options: question.options,
    answer: isRevealed ? question.answer : null,
    explain: isRevealed ? question.explain : null,
  };
}

export async function createLiveQuiz(
  teacherId: string,
  input: { classId: string; lessonId: string; count: number; seconds: number },
) {
  await getTeacherClass(teacherId, input.classId);
  const { versionId, questions } = await loadPinnedLessonQuestions(input.classId, input.lessonId);
  const picked = pickLiveQuestions(questions, input.count);
  if (!picked.length) {
    throw new ServiceError("no_questions");
  }
  return callRpc(
    "create_live_quiz",
    {
      p_teacher_id: teacherId,
      p_class_id: input.classId,
      p_lesson_id: input.lessonId,
      p_version_id: versionId,
      p_questions: picked,
      p_seconds: input.seconds,
    },
    z.uuid(),
  );
}

// How many questions a round can draw from this lesson, and the round still open, if any.
export async function getLiveQuizSetup(teacherId: string, classId: string, lessonId: string) {
  const classRow = await getTeacherClass(teacherId, classId);
  if (!classRow.active || classRow.self_study) {
    return null;
  }
  let eligible = 0;
  try {
    const { questions } = await loadPinnedLessonQuestions(classId, lessonId);
    eligible = pickLiveQuestions(questions, Number.MAX_SAFE_INTEGER).length;
  } catch (error) {
    if (error instanceof ServiceError && error.code === "lesson_not_in_class") {
      return null;
    }
    throw error;
  }
  const open = await selectOptional(
    createServiceClient()
      .from("live_quizzes")
      .select("id")
      .eq("class_id", classId)
      .eq("lesson_id", lessonId)
      .neq("phase", "finished")
      .maybeSingle(),
    z.object({ id: z.uuid() }),
  );
  return { eligible, openQuizId: open?.id ?? null };
}

export async function advanceLiveQuiz(
  teacherId: string,
  quizId: string,
  revision: number,
  action: LiveAction,
) {
  return callRpc(
    "advance_live_quiz",
    { p_teacher_id: teacherId, p_quiz_id: quizId, p_revision: revision, p_action: action },
    z.number().int(),
  );
}

export async function getLiveHostState(teacherId: string, quizId: string) {
  const quiz = await loadQuiz(quizId, teacherId);
  const [players, answers, lang] = await Promise.all([
    loadPlayers(quizId),
    loadAnswers(quizId),
    loadClassLanguage(quiz.class_id),
  ]);
  const question = currentQuestion(quiz);
  const answeredIds = new Set(
    answers.filter((answer) => answer.questionIndex === quiz.current_index).map((a) => a.userId),
  );
  const showStandings = quiz.phase === "reveal" || quiz.phase === "finished";
  return {
    id: quiz.id,
    phase: quiz.phase as LivePhase,
    revision: quiz.revision,
    index: quiz.current_index,
    total: quiz.questions.length,
    lang,
    joinUrl: absoluteUrl(`/live/${quiz.id}`),
    ...timing(quiz),
    question,
    counts:
      question?.answer !== null && question
        ? countLiveChoices(answers, quiz.current_index, question.options.length)
        : null,
    players: players.map((player) => ({
      name: player.name,
      hasAnswered: answeredIds.has(player.userId),
    })),
    answeredCount: answeredIds.size,
    standings: showStandings
      ? rankLivePlayers(players, answers)
          .slice(0, TOP_STANDINGS)
          .map(({ name, points, correct, rank }) => ({ name, points, correct, rank }))
      : [],
  };
}

export type LiveHostState = Awaited<ReturnType<typeof getLiveHostState>>;

export async function joinLiveQuiz(userId: string, quizId: string) {
  if (!z.uuid().safeParse(quizId).success) {
    throw new ServiceError("not_found");
  }
  await callRpc("join_live_quiz", { p_user_id: userId, p_quiz_id: quizId }, z.unknown());
}

export async function getLivePlayerState(userId: string, quizId: string) {
  const quiz = await loadQuiz(quizId);
  const [players, answers, lang] = await Promise.all([
    loadPlayers(quizId),
    loadAnswers(quizId),
    loadClassLanguage(quiz.class_id),
  ]);
  const me = players.find((player) => player.userId === userId);
  if (!me) {
    throw new ServiceError("not_found");
  }
  const mine = answers.find(
    (answer) => answer.userId === userId && answer.questionIndex === quiz.current_index,
  );
  const isRevealed = quiz.phase === "reveal" || quiz.phase === "finished";
  const standings = rankLivePlayers(players, answers);
  const myStanding = standings.find((standing) => standing.userId === userId);
  return {
    phase: quiz.phase as LivePhase,
    revision: quiz.revision,
    index: quiz.current_index,
    total: quiz.questions.length,
    lang,
    name: me.name,
    ...timing(quiz),
    question: currentQuestion(quiz),
    // Right or wrong stays hidden until the teacher shows the answer to everyone.
    myAnswer: mine
      ? {
          choice: mine.choice,
          isCorrect: quiz.phase === "reveal" ? mine.isCorrect : null,
          points: quiz.phase === "reveal" ? mine.points : null,
        }
      : null,
    standing:
      isRevealed && myStanding
        ? {
            points: myStanding.points,
            correct: myStanding.correct,
            rank: myStanding.rank,
            players: standings.length,
          }
        : null,
    podium:
      quiz.phase === "finished"
        ? standings.slice(0, 3).map(({ name, points, rank }) => ({ name, points, rank }))
        : [],
  };
}

export type LivePlayerState = Awaited<ReturnType<typeof getLivePlayerState>>;

export async function submitLiveAnswer(
  userId: string,
  quizId: string,
  index: number,
  choice: number,
) {
  if (!z.uuid().safeParse(quizId).success) {
    throw new ServiceError("not_found");
  }
  await callRpc(
    "submit_live_answer",
    { p_user_id: userId, p_quiz_id: quizId, p_index: index, p_choice: choice },
    z.array(z.object({ is_correct: z.boolean(), points: z.number().int() })),
  );
}
