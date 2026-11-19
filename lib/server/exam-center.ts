import "server-only";

import { endOfVietnamDay, toVietnamDate } from "@/lib/daily-practice";
import { describeExamSource, examTitleFor } from "@/lib/exam-library";
import { JLPT_PRESETS } from "@/lib/jlpt";
import {
  listAssignablePracticeQuestions,
  listClassAssignments,
  listUserAttempts,
} from "@/lib/server/assignments";
import {
  getTeacherClass,
  listClassLessons,
  listStudentClasses,
  listTeacherClasses,
} from "@/lib/server/classes";
import { listLearnerJlptHistory } from "@/lib/server/jlpt-history";
import { listRecentExamUses, publishJlptExam } from "@/lib/server/jlpt-exams";
import { ServiceError } from "@/lib/server/supabase";

import type { ExamSource } from "@/lib/exam-library";
import type { JlptLevel } from "@/lib/jlpt";
import type { JlptHistoryEntry } from "@/lib/jlpt-history";
import type { Assignment } from "@/lib/server/assignments";

// The "Luyện đề" page: every mock exam of the learner's classes with where they stand, and for a
// class the user owns (a self-study class, or a class they teach) the exams it can still open.
export type ExamStatus =
  | { kind: "not-started" }
  | { kind: "in-progress" }
  | { kind: "closed" }
  | { kind: "submitted"; result: JlptHistoryEntry | null };

export interface ExamRow {
  assignmentId: string;
  title: string;
  level: JlptLevel;
  minutes: number;
  dueAt: string | null;
  source: "official" | "reng" | "other";
  // Null for a class the user only teaches: they do not take its exams.
  status: ExamStatus | null;
}

export interface LibraryEntry {
  source: ExamSource;
  // Exams the class already opened from this lesson.
  opened: number;
}

export interface ClassExams {
  classId: string;
  className: string;
  isSelfStudy: boolean;
  isLearner: boolean;
  isOwner: boolean;
  exams: ExamRow[];
  library: LibraryEntry[];
}

const sourceKey = (classId: string, lessonId: string) => `${classId}:${lessonId}`;

function sourceKindOf(source: ExamSource | null): ExamRow["source"] {
  if (!source) {
    return "other";
  }
  return source.kind === "official" ? "official" : "reng";
}

/** The pinned lessons of a class that make whole mock exams, with what earlier exams used. */
async function loadLibrary(classId: string, exams: readonly Assignment[]) {
  const [lessons, uses] = await Promise.all([
    listClassLessons(classId),
    listRecentExamUses(classId),
  ]);
  const used = new Set(uses.map((use) => use.questionId));
  // Banks and official tests have no vocabulary; the Minna lessons a class reads are skipped.
  const candidates = lessons.filter((lesson) => !lesson.hasVocab);
  const sources = await Promise.all(
    candidates.map(async (lesson) => {
      const questions = await listAssignablePracticeQuestions(classId, lesson.lessonId);
      return describeExamSource(
        lesson.lessonId,
        lesson.title,
        questions.map((question) => ({
          id: question.id,
          type: question.type,
          tags: question.tags,
          passage: question.passage ?? null,
        })),
        used,
      );
    }),
  );
  return sources.flatMap((source): LibraryEntry[] =>
    source
      ? [{ source, opened: exams.filter((exam) => exam.lessonId === source.lessonId).length }]
      : [],
  );
}

function statusOf(
  assignment: Assignment,
  attempts: Awaited<ReturnType<typeof listUserAttempts>>,
  results: ReadonlyMap<string, JlptHistoryEntry>,
  now: Date,
): ExamStatus {
  const mine = attempts.filter((attempt) => attempt.assignmentId === assignment.id);
  if (mine.some((attempt) => attempt.status === "submitted")) {
    return { kind: "submitted", result: results.get(assignment.id) ?? null };
  }
  if (mine.length) {
    return { kind: "in-progress" };
  }
  return assignment.dueAt && Date.parse(assignment.dueAt) < now.getTime()
    ? { kind: "closed" }
    : { kind: "not-started" };
}

export async function loadExamCenter(userId: string, isTeacher: boolean, now: Date) {
  const [learnerClasses, ownedClasses] = await Promise.all([
    listStudentClasses(userId),
    isTeacher ? listTeacherClasses(userId) : Promise.resolve([]),
  ]);
  const japaneseOwned = ownedClasses.filter((item) => item.active && item.language_tag === "ja-JP");
  const classIds = [
    ...new Set([...learnerClasses.map((item) => item.id), ...japaneseOwned.map((item) => item.id)]),
  ];
  const assignments = (await listClassAssignments(classIds)).filter((item) => item.exam !== null);
  const [attempts, history] = await Promise.all([
    listUserAttempts(
      userId,
      assignments.map((item) => item.id),
    ),
    listLearnerJlptHistory(userId, now),
  ]);
  const results = new Map(history.map((entry) => [entry.assignmentId, entry]));
  const owned = new Map(japaneseOwned.map((item) => [item.id, item]));
  const libraries = new Map(
    await Promise.all(
      japaneseOwned.map(
        async (item) =>
          [
            item.id,
            await loadLibrary(
              item.id,
              assignments.filter((exam) => exam.classId === item.id),
            ),
          ] as const,
      ),
    ),
  );
  // Whether an exam came from an official test or a Reng bank, from the library of its class or,
  // for a class the user only learns in, from its source lesson.
  const kinds = new Map<string, ExamRow["source"]>();
  for (const [classId, library] of libraries) {
    for (const entry of library) {
      kinds.set(sourceKey(classId, entry.source.lessonId), sourceKindOf(entry.source));
    }
  }
  const unknown = [
    ...new Set(assignments.map((exam) => sourceKey(exam.classId, exam.lessonId))),
  ].filter((key) => !kinds.has(key));
  await Promise.all(
    unknown.map(async (key) => {
      const [classId, lessonId] = key.split(":");
      try {
        const questions = await listAssignablePracticeQuestions(classId, lessonId);
        const source = describeExamSource(
          lessonId,
          "",
          questions.map((question) => ({
            id: question.id,
            type: question.type,
            tags: question.tags,
            passage: question.passage ?? null,
          })),
        );
        kinds.set(key, sourceKindOf(source));
      } catch {
        kinds.set(key, "other");
      }
    }),
  );
  const learnerIds = new Set(learnerClasses.map((item) => item.id));
  const summaries = [
    ...learnerClasses.map((item) => ({
      id: item.id,
      name: item.name,
      isSelfStudy: item.isSelfStudy,
    })),
    ...japaneseOwned
      .filter((item) => !learnerIds.has(item.id))
      .map((item) => ({ id: item.id, name: item.name, isSelfStudy: item.self_study })),
  ];
  return summaries
    .map((item): ClassExams => {
      const isLearner = learnerIds.has(item.id);
      return {
        classId: item.id,
        className: item.name,
        isSelfStudy: item.isSelfStudy,
        isLearner,
        isOwner: owned.has(item.id),
        exams: assignments
          .filter((exam) => exam.classId === item.id && exam.exam)
          .map((exam) => ({
            assignmentId: exam.id,
            title: exam.title,
            level: exam.exam?.level ?? "N5",
            minutes: exam.exam?.timeLimitMinutes ?? 0,
            dueAt: exam.dueAt,
            source: kinds.get(sourceKey(exam.classId, exam.lessonId)) ?? "other",
            status: isLearner ? statusOf(exam, attempts, results, now) : null,
          })),
        library: libraries.get(item.id) ?? [],
      };
    })
    .filter((item) => item.exams.length || item.library.length);
}

// A self-study learner has a month to start an exam they open; a class gets a week.
const OPEN_DAYS = { selfStudy: 30, teaching: 7 };

/**
 * Opens one exam from the class's library: an official test as it is, or the next Reng exam from
 * a bank, with the level's time and results right after handing in.
 */
export async function openExamFromLibrary(
  teacherId: string,
  classId: string,
  lessonId: string,
  now: Date,
) {
  const classRow = await getTeacherClass(teacherId, classId);
  const exams = (await listClassAssignments([classId])).filter((item) => item.exam !== null);
  const library = await loadLibrary(classId, exams);
  const entry = library.find((item) => item.source.lessonId === lessonId);
  if (!entry) {
    throw new ServiceError("no_exam_questions");
  }
  if (entry.source.kind === "official" && entry.opened > 0) {
    throw new ServiceError("already_open");
  }
  const days = classRow.self_study ? OPEN_DAYS.selfStudy : OPEN_DAYS.teaching;
  const dueDay = toVietnamDate(new Date(now.getTime() + days * 24 * 60 * 60 * 1000));
  return publishJlptExam(teacherId, {
    classId,
    lessonId,
    level: entry.source.level,
    title: examTitleFor(entry.source, entry.opened),
    dueAt: endOfVietnamDay(dueDay),
    timeLimitMinutes: JLPT_PRESETS[entry.source.level].minutes,
    feedbackPolicy: "after_submit",
  });
}
