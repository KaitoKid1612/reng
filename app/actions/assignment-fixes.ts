"use server";

import { refresh } from "next/cache";

import { getCurrentAccount } from "@/lib/server/account";
import { fixAssignmentQuestion } from "@/lib/server/assignment-fixes";
import { describeServiceFailure } from "@/lib/server/supabase";

import type { DisplayFix } from "@/lib/assignment-fix";

export interface FixQuestionState {
  error?: string;
  notice?: string;
  isSaved?: boolean;
  // What the teacher typed, returned with an error because React resets the form after an action.
  values?: DisplayFix;
}

const NOT_FOUND = "Không tìm thấy câu này trong bài giao của lớp bạn.";

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

function readList(formData: FormData, name: string) {
  return formData.has(name) ? formData.getAll(name).map(String) : undefined;
}

export async function fixQuestionAction(
  _state: FixQuestionState,
  formData: FormData,
): Promise<FixQuestionState> {
  const account = await getCurrentAccount();
  if (account?.role !== "teacher") {
    return { error: NOT_FOUND };
  }
  const fix: DisplayFix = {
    prompt: readText(formData, "prompt") ?? "",
    explain: readText(formData, "explain") ?? "",
    passage: readText(formData, "passage"),
    transcript: readText(formData, "transcript"),
    options: readList(formData, "option"),
    tokens: readList(formData, "token"),
  };
  try {
    const result = await fixAssignmentQuestion(
      account.id,
      readText(formData, "assignmentId") ?? "",
      readText(formData, "questionId") ?? "",
      readText(formData, "hash") ?? "",
      fix,
    );
    switch (result.status) {
      case "fixed":
        refresh();
        return {
          isSaved: true,
          notice:
            "Đã sửa. Học viên mở lại bài sẽ thấy nội dung mới; câu trả lời và điểm giữ nguyên.",
        };
      case "unchanged":
        return { notice: "Chưa có gì thay đổi.", values: fix };
      case "conflict":
        return {
          error: "Câu này vừa được sửa ở nơi khác. Tải lại trang rồi sửa tiếp.",
          values: fix,
        };
      case "invalid":
        return { error: result.message, values: fix };
      case "not_found":
        return { error: NOT_FOUND };
    }
  } catch (error) {
    console.error("Display fix failed", describeServiceFailure(error));
    return { error: "Chưa lưu được. Thử lại sau nhé.", values: fix };
  }
}
