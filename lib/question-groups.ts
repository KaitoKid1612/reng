import { JLPT_PARTS, jlptPartOf } from "@/lib/jlpt-parts";

export interface GroupableQuestion {
  id: string;
  type: string;
  tags: readonly string[];
}

export interface QuestionGroup {
  key: string;
  label: string;
  // Part names of the JLPT test are Japanese (漢字読み…).
  lang?: "ja";
  questionIds: string[];
}

interface GroupKey {
  key: string;
  label: string;
  lang?: "ja";
  order: number;
}

// Review banks tag a question with the Minna lesson it practises as minna-17 or minna:17.
const MINNA_LESSON_TAG = /^minna[-:](\d{1,2})$/;

export function minnaLessonOf(tags: readonly string[]): number | null {
  for (const tag of tags) {
    const match = MINNA_LESSON_TAG.exec(tag.trim().toLowerCase());
    if (match) {
      return Number(match[1]);
    }
  }
  return null;
}

const OTHER_KEY = "other";

function groupBy<Question extends GroupableQuestion>(
  questions: readonly Question[],
  keyOf: (question: Question) => GroupKey | null,
): QuestionGroup[] {
  const groups = new Map<string, GroupKey & { questionIds: string[] }>();
  for (const question of questions) {
    const key = keyOf(question) ?? { key: OTHER_KEY, label: "Câu khác", order: Infinity };
    const group = groups.get(key.key) ?? { ...key, questionIds: [] };
    group.questionIds.push(question.id);
    groups.set(key.key, group);
  }
  return [...groups.values()]
    .sort((first, second) => first.order - second.order)
    .map(({ key, label, lang, questionIds }) => ({
      key,
      label,
      ...(lang ? { lang } : {}),
      questionIds,
    }));
}

function namedGroupCount(groups: readonly QuestionGroup[]) {
  return groups.filter((group) => group.key !== OTHER_KEY).length;
}

/**
 * Splits a large bank into the groups a teacher picks from: the Minna lessons its questions
 * practise, else the JLPT parts (もんだい) of a bank written in the test's parts, else the question
 * types. Groups keep the bank's question order inside them.
 */
export function groupQuestionsForPicking<Type extends string>(
  questions: readonly (GroupableQuestion & { type: Type })[],
  typeLabel: (type: Type) => string,
): QuestionGroup[] {
  const byLesson = groupBy(questions, (question) => {
    const lesson = minnaLessonOf(question.tags);
    return lesson === null
      ? null
      : { key: `minna-${lesson}`, label: `Bài ${lesson}`, order: lesson };
  });
  if (namedGroupCount(byLesson) >= 2) {
    return byLesson;
  }
  const byPart = groupBy(questions, (question) => {
    const part = jlptPartOf(question);
    return part
      ? { key: part.tag, label: part.label, lang: "ja", order: JLPT_PARTS.indexOf(part) }
      : null;
  });
  if (namedGroupCount(byPart) >= 2) {
    return byPart;
  }
  const typeOrder = [...new Set(questions.map((question) => question.type))];
  return groupBy(questions, (question) => ({
    key: question.type,
    label: typeLabel(question.type),
    order: typeOrder.indexOf(question.type),
  }));
}
