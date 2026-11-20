/**
 * Order of a teacher's lessons: course by course in teaching order (Minna Shokyū I, then II, then
 * JLPT material from N5 up), then by the lesson's order in its course, then by title. Sorting by
 * order alone interleaves "Bài 1", "Mẹo N4 · 1" and a review bank that all have order 1.
 */
export interface OrderedLesson {
  courseId: string;
  orderNo: number;
  title: string;
}

function courseRank(courseId: string): [number, number] {
  const minna = /^minna-(\d+)$/.exec(courseId);
  if (minna) {
    return [0, Number(minna[1])];
  }
  // n5, n4, n4-grammar, n4-tips…: the lower JLPT level is studied first, so N5 comes before N4.
  const jlpt = /^n(\d)(?:$|-)/.exec(courseId);
  if (jlpt) {
    return [1, 10 - Number(jlpt[1])];
  }
  return [2, 0];
}

const collator = new Intl.Collator("vi", { numeric: true, sensitivity: "base" });

export function compareLessons(first: OrderedLesson, second: OrderedLesson) {
  const [firstGroup, firstLevel] = courseRank(first.courseId);
  const [secondGroup, secondLevel] = courseRank(second.courseId);
  return (
    firstGroup - secondGroup ||
    firstLevel - secondLevel ||
    // Within a level, the main course (n4) comes before its side courses (n4-grammar, n4-tips).
    collator.compare(first.courseId, second.courseId) ||
    first.orderNo - second.orderNo ||
    collator.compare(first.title, second.title)
  );
}
