interface HardQuestionGroup {
  assignment: { id: string; title: string };
  questions: { question_id: string; prompt: string; wrong_count: number; total_count: number }[];
}

interface HardQuestionListProps {
  groups: HardQuestionGroup[];
}

// One collapsible group per assignment, newest first and open. With only a few learners nearly
// every mistake passes the 50% mark, so listing every assignment at once buries the page.
export function HardQuestionList({ groups }: HardQuestionListProps) {
  return (
    <div className="hard-question-groups">
      {groups.map((group, index) => (
        <details
          key={group.assignment.id}
          className="result-row hard-question-group"
          data-correct="false"
          open={index === 0}
        >
          <summary>
            <span>{group.assignment.title}</span>
            <span className="item-meta">{group.questions.length} câu</span>
          </summary>
          <ol className="hard-question-list">
            {group.questions.map((question) => (
              <li key={question.question_id}>
                <span lang="ja">{question.prompt}</span>
                <span className="hard-question-count">
                  {question.wrong_count}/{question.total_count}
                  <span className="visually-hidden"> học viên sai</span>
                </span>
              </li>
            ))}
          </ol>
        </details>
      ))}
    </div>
  );
}
