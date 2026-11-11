import type { ClassWorkProgress } from "@/lib/learner-class-progress";

interface ClassWorkMeterProps {
  progress: ClassWorkProgress | undefined;
}

// How much of a class's work the learner has handed in, beside the class in Lớp của tôi.
export function ClassWorkMeter({ progress }: ClassWorkMeterProps) {
  if (!progress?.total) {
    return <p className="class-work-meter small muted">Chưa có bài tập</p>;
  }
  const { submitted, total } = progress;
  return (
    <div className="class-work-meter" data-complete={submitted === total}>
      <p className="small">
        Đã nộp <strong>{submitted}</strong>/{total} bài
      </p>
      <progress value={submitted} max={total} aria-label="Số bài đã nộp của lớp" />
    </div>
  );
}
