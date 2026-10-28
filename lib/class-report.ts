import { toPercent } from "@/lib/grading/grade";
import { formatStudyDay } from "@/lib/study-days";

export const LEARNER_LABELS = {
  abandoned: "Bỏ bài",
  failing: "Chưa đạt",
  weak_listening: "Yếu phần nghe",
  passing: "Đạt",
  no_data: "Chưa có dữ liệu",
} as const;

export type LearnerLabel = keyof typeof LEARNER_LABELS;

const ATTENTION_LABELS: readonly LearnerLabel[] = ["abandoned", "failing", "weak_listening"];
const WEAK_LISTENING_PERCENT = 60;
const WEAK_LISTENING_REPLAYS = 3;

export interface ReportAssignment {
  id: string;
  title: string;
  dueAt: string | null;
  publishedAt: string;
}

export interface ReportSubmission {
  assignmentId: string;
  userId: string;
  attemptNo: number;
  score: number;
  maxScore: number;
  submittedAt: string;
}

export interface ReportMember {
  userId: string;
  fullName: string;
  email: string;
  joinedAt: string;
}

export interface ListeningSummary {
  percent: number | null;
  averageListens: number | null;
}

export interface MemberReport {
  member: ReportMember;
  assignedCount: number;
  submittedCount: number;
  averagePercent: number | null;
  percents: Record<string, number | null>;
  averageListens: number | null;
  label: LearnerLabel;
  lastStudyDay: string | null;
}

function submissionKey(userId: string, assignmentId: string) {
  return `${userId}/${assignmentId}`;
}

// Reports use the most recent submitted attempt, not the best one.
export function selectLatestSubmissions(submissions: readonly ReportSubmission[]) {
  const latest = new Map<string, ReportSubmission>();
  for (const submission of submissions) {
    const key = submissionKey(submission.userId, submission.assignmentId);
    const current = latest.get(key);
    const isNewer =
      !current ||
      Date.parse(submission.submittedAt) > Date.parse(current.submittedAt) ||
      (submission.submittedAt === current.submittedAt && submission.attemptNo > current.attemptNo);
    if (isNewer) {
      latest.set(key, submission);
    }
  }
  return latest;
}

// After leaving and rejoining, only work published since the current join counts as assigned;
// earlier work still counts when the learner chose to submit it.
export function getAssignedWork(
  assignments: readonly ReportAssignment[],
  member: ReportMember,
  hasSubmission: (assignmentId: string) => boolean,
) {
  return assignments.filter(
    (assignment) =>
      Date.parse(assignment.publishedAt) >= Date.parse(member.joinedAt) ||
      hasSubmission(assignment.id),
  );
}

export function isAbandoned(
  assigned: readonly ReportAssignment[],
  hasSubmission: (assignmentId: string) => boolean,
  now: Date,
) {
  const overdue = assigned
    .filter((assignment) => assignment.dueAt && Date.parse(assignment.dueAt) < now.getTime())
    .sort((first, second) => Date.parse(second.dueAt ?? "") - Date.parse(first.dueAt ?? ""))
    .slice(0, 2);
  return overdue.length === 2 && overdue.every((assignment) => !hasSubmission(assignment.id));
}

export interface LabelInput {
  isAbandoned: boolean;
  averagePercent: number | null;
  passScore: number;
  listening: ListeningSummary;
}

export function computeLearnerLabel(input: LabelInput): LearnerLabel {
  if (input.isAbandoned) {
    return "abandoned";
  }
  if (input.averagePercent === null) {
    return "no_data";
  }
  if (input.averagePercent < input.passScore) {
    return "failing";
  }
  const { percent, averageListens } = input.listening;
  const hasWeakListening =
    (percent !== null && percent < WEAK_LISTENING_PERCENT) ||
    (averageListens !== null && averageListens > WEAK_LISTENING_REPLAYS);
  return hasWeakListening ? "weak_listening" : "passing";
}

export interface MemberReportInput {
  member: ReportMember;
  assignments: readonly ReportAssignment[];
  latest: ReadonlyMap<string, ReportSubmission>;
  passScore: number;
  now: Date;
  listening?: ListeningSummary;
  lastStudyDay?: string | null;
}

export function buildMemberReport(input: MemberReportInput): MemberReport {
  const assigned = getAssignedWork(input.assignments, input.member, (assignmentId) =>
    input.latest.has(submissionKey(input.member.userId, assignmentId)),
  );
  const percents: Record<string, number | null> = {};
  for (const assignment of assigned) {
    const submission = input.latest.get(submissionKey(input.member.userId, assignment.id));
    percents[assignment.id] = submission ? toPercent(submission.score, submission.maxScore) : null;
  }
  const submittedPercents = Object.values(percents).filter(
    (percent): percent is number => percent !== null,
  );
  const averagePercent = submittedPercents.length
    ? submittedPercents.reduce((total, percent) => total + percent, 0) / submittedPercents.length
    : null;
  const listening = input.listening ?? { percent: null, averageListens: null };
  return {
    member: input.member,
    assignedCount: assigned.length,
    submittedCount: submittedPercents.length,
    averagePercent,
    percents,
    averageListens: listening.averageListens,
    label: computeLearnerLabel({
      isAbandoned: isAbandoned(
        assigned,
        (assignmentId) => percents[assignmentId] !== null,
        input.now,
      ),
      averagePercent,
      passScore: input.passScore,
      listening,
    }),
    lastStudyDay: input.lastStudyDay ?? null,
  };
}

export function summarizeClass(reports: readonly MemberReport[]) {
  const averages = reports
    .map((report) => report.averagePercent)
    .filter((average): average is number => average !== null);
  return {
    submittedCount: reports.reduce((total, report) => total + report.submittedCount, 0),
    averagePercent: averages.length
      ? averages.reduce((total, average) => total + average, 0) / averages.length
      : null,
    passingCount: reports.filter((report) => report.label === "passing").length,
    attentionCount: reports.filter((report) => ATTENTION_LABELS.includes(report.label)).length,
  };
}

export function formatPercentValue(value: number | null) {
  return value === null ? "" : String(Math.round(value * 10) / 10);
}

// Prevents spreadsheet formula execution while keeping Vietnamese text intact.
export function escapeCsvCell(value: string) {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${guarded.replaceAll('"', '""')}"`;
}

export function toCsv(rows: readonly (readonly string[])[]) {
  // The byte order mark lets spreadsheet software detect UTF-8 diacritics.
  return `﻿${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}\r\n`;
}

export function buildReportCsv(
  assignments: readonly ReportAssignment[],
  reports: readonly MemberReport[],
) {
  const header = [
    "Họ tên",
    "Email",
    "Đã nộp",
    "Được giao",
    "Điểm TB (%)",
    ...assignments.map((assignment) => `${assignment.title} (%)`),
    "Nhãn",
    "Ngày học gần nhất",
  ];
  const rows = reports.map((report) => [
    report.member.fullName,
    report.member.email,
    // Separate counts avoid spreadsheet software reading "3/5" as a date.
    String(report.submittedCount),
    String(report.assignedCount),
    formatPercentValue(report.averagePercent),
    ...assignments.map((assignment) => formatPercentValue(report.percents[assignment.id] ?? null)),
    LEARNER_LABELS[report.label],
    report.lastStudyDay ? formatStudyDay(report.lastStudyDay) : "",
  ]);
  return toCsv([header, ...rows]);
}
