import type { RawAnswer } from "@/lib/grading/raw-answer";
import type { ReviewRating } from "@/lib/review-ratings";

export type ReviewRequest =
  | {
      kind: "vocab";
      lessonId: string;
      vocabId: string;
      rating: ReviewRating;
      revision: number | null;
    }
  | {
      kind: "mistake";
      assignmentId: string;
      questionId: string;
      answer: RawAnswer | undefined;
      revision: number;
    };

export type ReviewResponse =
  | { status: "ok"; data: Record<string, unknown> }
  | { status: "conflict" | "not_due" | "signed_out" | "network" | "failed" };

// The request ID is reused on retry so a lost response is never counted twice.
export async function sendReview(
  requestId: string,
  request: ReviewRequest,
): Promise<ReviewResponse> {
  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...request, requestId }),
    });
    const data: unknown = await response.json().catch(() => null);
    const body = data && typeof data === "object" ? { ...data } : {};
    if (response.ok) {
      return { status: "ok", data: body };
    }
    if (response.status === 401) {
      return { status: "signed_out" };
    }
    const code = "code" in body ? body.code : null;
    if (code === "conflict" || code === "not_due") {
      return { status: code };
    }
    return { status: "failed" };
  } catch {
    return { status: "network" };
  }
}

export const REVIEW_FAILURES: Record<Exclude<ReviewResponse["status"], "ok">, string> = {
  conflict: "Thẻ này vừa được ôn ở tab khác. Chuyển sang thẻ tiếp theo.",
  not_due: "Thẻ này chưa đến hạn ôn. Chuyển sang thẻ tiếp theo.",
  signed_out: "Phiên đăng nhập đã hết. Đăng nhập lại để lưu kết quả ôn.",
  network: "Mất kết nối nên chưa lưu. Bấm lại để thử tiếp.",
  failed: "Chưa lưu được kết quả. Bạn thử lại nhé.",
};
