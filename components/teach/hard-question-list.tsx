import { FuriganaText } from "@/components/lessons/japanese-text";

import type { QuestionLang } from "@/lib/assignment";

interface HardQuestion {
  question_id: string;
  prompt: string;
  wrong_count: number;
  total_count: number;
}

interface HardQuestionGroup {
  assignment: { id: string; title: string };
  questions: HardQuestion[];
}

interface HardQuestionListProps {
  groups: HardQuestionGroup[];
  lang: QuestionLang;
}

interface HardQuestionItemsProps {
  questions: HardQuestion[];
  lang: QuestionLang;
  start?: number;
}

// Questions arrive most-missed first; the rest of a long group (a 60-question daily set in a class
// of one learner lists every mistake) stays one tap away.
const VISIBLE_QUESTIONS = 10;

function HardQuestionItems({ questions, lang, start }: HardQuestionItemsProps) {
  return (
    <ol className="hard-question-list" start={start}>
      {questions.map((question) => (
        <li key={question.question_id}>
          <span lang={lang}>
            <FuriganaText text={question.prompt} />
          </span>
          <span className="hard-question-count">
            {question.wrong_count}/{question.total_count}
            <span className="visually-hidden"> học viên sai</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

// One collapsible group per assignment, newest first and open. With only a few learners nearly
// every mistake passes the 50% mark, so listing every assignment at once buries the page.
export function HardQuestionList({ groups, lang }: HardQuestionListProps) {
  return (
    <div className="hard-question-groups">
      {groups.map((group, index) => {
        const hidden = group.questions.slice(VISIBLE_QUESTIONS);
        return (
          <details
            key={group.assignment.id}
            className="collapse-card hard-question-group"
            open={index === 0}
          >
            <summary>
              <span>{group.assignment.title}</span>
              <span className="item-meta">{group.questions.length} câu</span>
            </summary>
            <HardQuestionItems
              questions={group.questions.slice(0, VISIBLE_QUESTIONS)}
              lang={lang}
            />
            {hidden.length > 0 && (
              <details className="hard-question-more">
                <summary>Xem thêm {hidden.length} câu</summary>
                <HardQuestionItems questions={hidden} lang={lang} start={VISIBLE_QUESTIONS + 1} />
              </details>
            )}
          </details>
        );
      })}
    </div>
  );
}
