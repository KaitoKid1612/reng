import { dailySourceState, repeatsEveryDay } from "@/lib/daily-practice";

interface DailyPracticeStatusProps {
  size: number | null;
  pinnedLessonId: string | null;
  pinnedTitle: string | null;
  source: { lessonId: string; title: string; questionCount: number } | null;
}

export function DailyPracticeStatus({
  size,
  pinnedLessonId,
  pinnedTitle,
  source,
}: DailyPracticeStatusProps) {
  if (!source) {
    return (
      <p className="notice-panel" role="status">
        Lớp chưa có bài đang mở có câu chọn hoặc điền từ, nên Reng chưa giao được bài luyện. Thêm
        bài có câu hỏi vào lớp trước.
      </p>
    );
  }
  const state = dailySourceState(pinnedLessonId, source.lessonId);
  const described = `«${source.title}» (${source.questionCount} câu chọn/điền/sắp xếp)`;
  return (
    <>
      {state === "automatic" && (
        <p className="small muted">
          Đang lấy câu tự động từ bài mới nhất đã mở có câu hỏi: {described}. Thêm bài mới vào lớp
          sẽ đổi nguồn; chọn một bài ở ô Lấy câu từ để giữ cố định.
        </p>
      )}
      {state === "pinned" && (
        <p className="small muted">
          Đang lấy câu từ {described}, giữ nguyên khi bạn thêm bài mới vào lớp.
        </p>
      )}
      {state === "fallback" && (
        <p className="notice-panel" role="status">
          Bài đã chọn «{pinnedTitle ?? "không còn trong lớp"}» chưa mở hoặc chưa có câu
          chọn/điền/sắp xếp, nên Reng tạm lấy từ {described}.
        </p>
      )}
      {repeatsEveryDay(source.questionCount, size) && (
        <p className="notice-panel" role="status">
          Bài nguồn chỉ có {source.questionCount} câu, ít hơn {size} câu mỗi ngày: ngày nào học viên
          cũng gặp lại cả {source.questionCount} câu. Chọn bài có nhiều câu hơn hoặc giảm số câu mỗi
          ngày.
        </p>
      )}
    </>
  );
}
