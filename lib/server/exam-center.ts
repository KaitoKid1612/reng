import "server-only";

import { endOfVietnamDay, toVietnamDate } from "@/lib/daily-practice";
import { describeExamSource, describeFixedExamSources, examTitleFor } from "@/lib/exam-library";
import { JLPT_PRESETS } from "@/lib/jlpt";
import { findJlptExamSet, fixedRengExamSets } from "@/lib/jlpt-exam-sets";
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
  // The source lesson is open to the class: its learners can read its questions and check the
  // answers in the lesson, so an exam from it is not closed-book.
  isSourceOpen: boolean;
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
  if (source.kind === "official") {
    return source.year ? "official" : "other";
  }
  return "reng";
}

/** The pinned lessons of a class that make whole mock exams, with what earlier exams used. */
async function loadLibrary(classId: string, exams: readonly Assignment[], now: Date) {
  const [lessons, uses] = await Promise.all([
    listClassLessons(classId),
    listRecentExamUses(classId),
  ]);
  const used = new Set(uses.map((use) => use.questionId));
  // Banks and official tests have no vocabulary; the Minna lessons a class reads are skipped.
  const candidates = lessons.filter((lesson) => !lesson.hasVocab);
  const openLessons = new Set(
    candidates
      .filter((lesson) => Date.parse(lesson.availableAt) <= now.getTime())
      .map((lesson) => lesson.lessonId),
  );
  const sources = await Promise.all(
    candidates.map(async (lesson) => {
      const questions = await listAssignablePracticeQuestions(classId, lesson.lessonId);
      const bank = describeExamSource(
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
      if (bank?.kind !== "bank") {
        return bank ? [bank] : [];
      }
      // A bank that holds a fixed exam offers it first: one exam the teacher can also print.
      const fixed = describeFixedExamSources(
        lesson.lessonId,
        lesson.title,
        new Set(questions.map((question) => question.id)),
        fixedRengExamSets(),
      );
      return [...fixed, bank];
    }),
  );
  // A fixed exam counts by its title; the bank's own numbering (Đề Reng N5 số k) skips it.
  const fixedTitles = new Set(fixedRengExamSets().map((set) => set.title));
  return sources.flat().map((source): LibraryEntry => ({
    source,
    isSourceOpen: openLessons.has(source.lessonId),
    opened: exams.filter(
      (exam) =>
        exam.lessonId === source.lessonId &&
        (source.kind === "fixed" ? exam.title === source.title : !fixedTitles.has(exam.title)),
    ).length,
  }));
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
  // A teacher's Đóng bài closes an exam like its closing time does: no Làm đề, no Làm tiếp.
  const isClosed =
    assignment.status === "closed" ||
    (assignment.dueAt !== null && Date.parse(assignment.dueAt) < now.getTime());
  if (isClosed) {
    return { kind: "closed" };
  }
  return mine.length ? { kind: "in-progress" } : { kind: "not-started" };
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
              now,
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
  // Set for a fixed Reng exam (reng-n5-1…); otherwise the lesson's official test or next exam.
  examSetId: string | null = null,
) {
  const classRow = await getTeacherClass(teacherId, classId);
  const exams = (await listClassAssignments([classId])).filter((item) => item.exam !== null);
  const library = await loadLibrary(classId, exams, now);
  const entry = library.find(
    (item) =>
      item.source.lessonId === lessonId &&
      (examSetId
        ? item.source.kind === "fixed" && item.source.setId === examSetId
        : item.source.kind !== "fixed"),
  );
  if (!entry) {
    throw new ServiceError("no_exam_questions");
  }
  if (entry.source.kind !== "bank" && entry.opened > 0) {
    throw new ServiceError("already_open");
  }
  const fixedSet = entry.source.kind === "fixed" ? findJlptExamSet(entry.source.setId) : null;
  const days = classRow.self_study ? OPEN_DAYS.selfStudy : OPEN_DAYS.teaching;
  const dueDay = toVietnamDate(new Date(now.getTime() + days * 24 * 60 * 60 * 1000));
  return publishJlptExam(
    teacherId,
    {
      classId,
      lessonId,
      level: entry.source.level,
      title: examTitleFor(entry.source, entry.opened),
      dueAt: endOfVietnamDay(dueDay),
      timeLimitMinutes: JLPT_PRESETS[entry.source.level].minutes,
      feedbackPolicy: "after_submit",
    },
    fixedSet?.questions.map((question) => question.id),
  );
}
