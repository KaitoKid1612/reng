import Link from "next/link";

import { PinVersionButton } from "@/components/teach/pin-version-button";
import { UsageDisclosure } from "@/components/teach/usage-disclosure";
import { UsageNoticeArea } from "@/components/teach/usage-notice";
import { classLessonState, summarizeLessonUsage } from "@/lib/teaching-start";

import type { ClassUsage, LessonUsage } from "@/lib/server/lesson-usage";
import type { ClassLessonState } from "@/lib/teaching-start";

interface LessonClassUsageProps {
  lessonId: string;
  usage: LessonUsage;
}

interface UsageItemProps {
  lessonId: string;
  item: ClassUsage;
  state: ClassLessonState;
  publishedVersionNo: number;
}

// Classes that need a step come first; a teacher with many classes sees the first few.
const STATE_ORDER: Record<ClassLessonState, number> = { older: 0, missing: 1, latest: 2 };
const VISIBLE_CLASSES = 5;

function UsageItem({ lessonId, item, state, publishedVersionNo }: UsageItemProps) {
  return (
    <li>
      <div>
        <Link href={`/teach/classes/${item.classId}`}>{item.className}</Link>
        <p className="item-meta">
          {state === "missing" && "Chưa có bài này."}
          {state === "older" &&
            `Đang dùng phiên bản ${item.usedVersionNo}, có bản mới ${publishedVersionNo}.`}
          {state === "latest" && `Đang dùng phiên bản ${publishedVersionNo}, mới nhất.`}
        </p>
      </div>
      {state !== "latest" && (
        <PinVersionButton
          classId={item.classId}
          className={item.className}
          lessonId={lessonId}
          isPrimary={state === "older"}
          label={state === "older" ? `Cập nhật lên phiên bản ${publishedVersionNo}` : "Đưa vào lớp"}
        />
      )}
    </li>
  );
}

// Publishing and putting a version into classes used to be two pages apart; the editor now shows
// every class with the one step it still needs.
export function LessonClassUsage({ lessonId, usage }: LessonClassUsageProps) {
  const published = usage.publishedVersion;
  const ranked = published
    ? usage.classes
        .map((item) => ({ item, state: classLessonState(item.usedVersionNo, published.versionNo) }))
        .sort((first, second) => STATE_ORDER[first.state] - STATE_ORDER[second.state])
    : [];
  const overview =
    published &&
    summarizeLessonUsage(
      ranked.map(({ state }) => state),
      published.versionNo,
    );
  return (
    <section className="lesson-usage" aria-labelledby="lesson-usage-title">
      <h2 id="lesson-usage-title">Dùng bài trong lớp</h2>
      {!published && (
        <p className="small muted">
          Bài chưa có bản xuất bản. Bấm Xuất bản trong trình soạn, rồi đưa bản đó vào lớp ở đây.
        </p>
      )}
      {published && !usage.classes.length && (
        <p className="small muted">
          Chưa có lớp nào. <Link href="/teach/classes">Tạo lớp</Link> rồi quay lại đây để đưa bài
          vào lớp.
        </p>
      )}
      {published && overview && usage.classes.length > 0 && (
        <UsageNoticeArea>
          <UsageDisclosure summary={overview.summary} needsStep={overview.needsStep}>
            <ul className="lesson-usage-list">
              {ranked.slice(0, VISIBLE_CLASSES).map(({ item, state }) => (
                <UsageItem
                  key={item.classId}
                  lessonId={lessonId}
                  item={item}
                  state={state}
                  publishedVersionNo={published.versionNo}
                />
              ))}
            </ul>
            {ranked.length > VISIBLE_CLASSES && (
              <details className="hard-question-more lesson-usage-more">
                <summary>Xem thêm {ranked.length - VISIBLE_CLASSES} lớp</summary>
                <ul className="lesson-usage-list">
                  {ranked.slice(VISIBLE_CLASSES).map(({ item, state }) => (
                    <UsageItem
                      key={item.classId}
                      lessonId={lessonId}
                      item={item}
                      state={state}
                      publishedVersionNo={published.versionNo}
                    />
                  ))}
                </ul>
              </details>
            )}
            <p className="small muted">
              Đưa vào lớp: bài mở ngay và xếp cuối danh sách bài của lớp. Cập nhật phiên bản giữ
              nguyên thứ tự và giờ mở. Muốn chọn thứ tự hoặc hẹn giờ mở, vào trang Giao bài của lớp.
            </p>
          </UsageDisclosure>
        </UsageNoticeArea>
      )}
    </section>
  );
}
