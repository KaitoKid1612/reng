import { formatStudyDateTime } from "@/lib/study-days";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

interface EmailFooter {
  reason: string;
  settingsUrl: string;
  unsubscribeUrl: string;
}

const COLORS = { ink: "#1C1B1A", muted: "#625F5A", primary: "#2B4C7E", border: "#E8E4DC" };

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function greetingName(name: string) {
  return name.trim().split(/\s+/).at(-1) || "Bạn";
}

function button(label: string, url: string) {
  return `<p style="margin:28px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:${COLORS.primary};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:6px">${escapeHtml(label)}</a></p>`;
}

function paragraph(html: string) {
  return `<p style="margin:0 0 12px;line-height:1.6">${html}</p>`;
}

// Emails ignore page stylesheets, so every rule is inline and every value is escaped.
function layout(heading: string, body: string, footer: EmailFooter) {
  return `<!doctype html><html lang="vi"><body style="margin:0;background:#FAF8F3;color:${COLORS.ink};font-family:'Be Vietnam Pro',Arial,sans-serif;font-size:16px">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="color:${COLORS.primary};font-size:22px;font-weight:700;margin:0 0 24px">Reng</p>
<h1 style="font-size:22px;line-height:1.4;margin:0 0 16px">${escapeHtml(heading)}</h1>
${body}
<hr style="border:0;border-top:1px solid ${COLORS.border};margin:32px 0 16px">
<p style="color:${COLORS.muted};font-size:13px;line-height:1.6;margin:0">${escapeHtml(footer.reason)}
<br><a href="${escapeHtml(footer.settingsUrl)}" style="color:${COLORS.muted}">Đổi tần suất nhận email</a>
<br><a href="${escapeHtml(footer.unsubscribeUrl)}" style="color:${COLORS.muted}">Hủy nhận email</a></p>
</div></body></html>`;
}

function textFooter(footer: EmailFooter) {
  return `\n--\n${footer.reason}\nĐổi tần suất: ${footer.settingsUrl}\nHủy nhận email: ${footer.unsubscribeUrl}\n`;
}

export interface WordOfDay {
  front: string;
  reading: string;
  meaning: string;
  lang: string;
}

// Japanese reads "kanji (kana)", Chinese "characters (pinyin)"; a word without reading is plain.
function describeWord(word: WordOfDay) {
  const written = word.reading ? `${word.front} (${word.reading})` : word.front;
  return `${written}: ${word.meaning}`;
}

export interface DailyReminderInput extends EmailFooter {
  name: string;
  streak: number;
  dueCards: number;
  assignments: { title: string; dueAt: string | null }[];
  word: WordOfDay | null;
  reviewUrl: string;
  assignmentsUrl: string;
}

export function renderDailyReminder(input: DailyReminderInput): EmailContent {
  const name = greetingName(input.name);
  const first = input.assignments[0];
  let subject = `${name} ơi, còn ${input.assignments.length} bài tập đang chờ`;
  if (input.dueCards > 0) {
    subject = `${name} ơi, hôm nay có ${input.dueCards} thẻ cần ôn`;
  } else if (first?.dueAt) {
    subject = `${name} ơi, “${first.title}” sắp đến hạn`;
  }
  const lines: string[] = [];
  if (input.streak > 0) {
    lines.push(
      `Chuỗi ngày học của bạn: ${input.streak} ngày. Học một chút tối nay để giữ chuỗi nhé.`,
    );
  }
  if (input.dueCards > 0) {
    lines.push(`${input.dueCards} thẻ đang chờ ôn.`);
  }
  const assignmentItems = input.assignments.map(
    (assignment) =>
      `${assignment.title}${assignment.dueAt ? ` (hạn ${formatStudyDateTime(assignment.dueAt)})` : ""}`,
  );
  const wordText = input.word ? describeWord(input.word) : "";
  const action =
    input.dueCards > 0
      ? { label: `Ôn ${input.dueCards} thẻ ngay`, url: input.reviewUrl }
      : { label: "Làm bài ngay", url: input.assignmentsUrl };
  const html = layout(
    subject,
    [
      ...lines.map((line) => paragraph(escapeHtml(line))),
      assignmentItems.length
        ? `${paragraph("Bài tập chưa nộp:")}<ul style="margin:0 0 12px;padding-left:20px;line-height:1.6">${assignmentItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
        : "",
      input.word
        ? paragraph(
            `Từ của ngày: <span lang="${escapeHtml(input.word.lang)}" style="font-size:20px">${escapeHtml(wordText)}</span>`,
          )
        : "",
      button(action.label, action.url),
    ].join("\n"),
    input,
  );
  const text = [
    subject,
    ...lines,
    ...(assignmentItems.length
      ? ["Bài tập chưa nộp:", ...assignmentItems.map((item) => `- ${item}`)]
      : []),
    ...(input.word ? [`Từ của ngày: ${wordText}`] : []),
    `${action.label}: ${action.url}`,
  ].join("\n");
  return { subject, html, text: text + textFooter(input) };
}

export interface WeekStats {
  reviews: number;
  submissions: number;
  averagePercent: number | null;
}

export interface WeeklySummaryInput extends EmailFooter {
  name: string;
  thisWeek: WeekStats;
  lastWeek: WeekStats;
  progressUrl: string;
}

function describeChange(current: number, previous: number) {
  if (current === previous) {
    return "bằng tuần trước";
  }
  return current > previous
    ? `tăng ${current - previous} so với tuần trước`
    : `giảm ${previous - current} so với tuần trước`;
}

export function renderWeeklySummary(input: WeeklySummaryInput): EmailContent {
  const name = greetingName(input.name);
  const subject = `${name} ơi, tuần này bạn ôn ${input.thisWeek.reviews} thẻ`;
  const lines = [
    `Lượt ôn thẻ: ${input.thisWeek.reviews} (${describeChange(input.thisWeek.reviews, input.lastWeek.reviews)}).`,
    `Bài tập đã nộp: ${input.thisWeek.submissions} (${describeChange(input.thisWeek.submissions, input.lastWeek.submissions)}).`,
    input.thisWeek.averagePercent === null
      ? "Tuần này chưa có điểm bài tập."
      : `Điểm trung bình tuần này: ${Math.round(input.thisWeek.averagePercent)}%.`,
  ];
  const html = layout(
    subject,
    [
      ...lines.map((line) => paragraph(escapeHtml(line))),
      button("Xem tiến độ", input.progressUrl),
    ].join("\n"),
    input,
  );
  return {
    subject,
    html,
    text: [subject, ...lines, `Xem tiến độ: ${input.progressUrl}`].join("\n") + textFooter(input),
  };
}

export interface DigestClass {
  name: string;
  url: string;
  newSubmissions: number;
  attention: string[];
  hardQuestions: { prompt: string; wrong: number; total: number }[];
}

export interface TeacherDigestInput extends EmailFooter {
  name: string;
  classes: DigestClass[];
}

export function renderTeacherDigest(input: TeacherDigestInput): EmailContent {
  const submissions = input.classes.reduce((total, item) => total + item.newSubmissions, 0);
  const attention = input.classes.reduce((total, item) => total + item.attention.length, 0);
  const subject = `Tóm tắt lớp sáng nay: ${submissions} bài nộp mới, ${attention} học viên cần chú ý`;
  const sections = input.classes.map((item) => {
    const lines = [
      `${item.newSubmissions} bài nộp trong 24 giờ qua.`,
      item.attention.length
        ? `Cần chú ý: ${item.attention.join(", ")}.`
        : "Chưa có học viên cần chú ý.",
      ...item.hardQuestions.map(
        (question) =>
          `Câu sai nhiều: ${question.prompt} (${question.wrong}/${question.total} học viên).`,
      ),
    ];
    return { title: item.name, url: item.url, lines };
  });
  const html = layout(
    subject,
    sections
      .map(
        (section) =>
          `<h2 style="font-size:18px;margin:24px 0 8px">${escapeHtml(section.title)}</h2>${section.lines.map((line) => paragraph(escapeHtml(line))).join("")}${button("Mở bảng theo dõi", section.url)}`,
      )
      .join("\n"),
    input,
  );
  const text = [
    subject,
    ...sections.flatMap((section) => [
      "",
      section.title,
      ...section.lines,
      `Mở bảng theo dõi: ${section.url}`,
    ]),
  ].join("\n");
  return { subject, html, text: text + textFooter(input) };
}
