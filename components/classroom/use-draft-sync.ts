"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { isSameAttemptDraft, parseAttemptDraft } from "@/lib/assignment";
import {
  localDraftKey,
  readLocalDraft,
  removeLocalDraft,
  writeLocalDraft,
} from "@/lib/local-draft";

import type { AttemptDraft, QuestionView } from "@/lib/assignment";

const SAVE_DELAY_MS = 800;
// Sent drafts whose reply never arrived, kept to recognise this browser's own save.
const MAX_UNCONFIRMED = 5;

export type SyncStatus =
  | "saved"
  | "pending"
  | "saving"
  | "offline"
  | "error"
  | "conflict"
  | "signed_out"
  | "submitted"
  | "closed"
  | "past_due"
  | "stale";

// These outcomes stop autosave until the learner reloads the attempt.
const BLOCKING_STATUSES: readonly SyncStatus[] = [
  "conflict",
  "submitted",
  "closed",
  "past_due",
  "stale",
];

// The revision this tab last saved, per attempt. Browser Back shows a page as it was first loaded
// (Next keeps it however old), so its revision can be older than this tab's own saves; restoring
// that copy would show answers as blank and drop the newer backup. The page is fetched again.
const savedRevisions = new Map<string, number>();

export interface DraftSyncOptions {
  userId: string;
  submissionId: string;
  views: readonly QuestionView[];
  initialDraft: AttemptDraft;
  initialRevision: number;
  initialSavedAt: string;
}

interface InitialSync {
  draft: AttemptDraft;
  status: SyncStatus;
  notice: string;
  shouldDiscardBackup: boolean;
}

// Unsynced local answers based on the current server revision win; a backup based on an
// older revision is discarded because the server copy is newer, unless that newer copy is
// a save from this browser whose reply never arrived. Pure, so it can run in a state
// initializer (the client-only runner has no server markup to hydrate).
function restoreDraft(options: DraftSyncOptions): InitialSync {
  const lastSaved = savedRevisions.get(options.submissionId);
  if (lastSaved !== undefined && lastSaved > options.initialRevision) {
    return {
      draft: options.initialDraft,
      status: "stale",
      notice: "Đang tải câu trả lời mới nhất…",
      shouldDiscardBackup: false,
    };
  }
  const backup = readLocalDraft(localDraftKey(options.userId, options.submissionId));
  const serverCopy = { draft: options.initialDraft, status: "saved" as const, notice: "" };
  if (!backup) {
    return { ...serverCopy, shouldDiscardBackup: false };
  }
  const isOwnLostSave = backup.unconfirmed.some((sent) =>
    isSameAttemptDraft(options.views, sent, options.initialDraft),
  );
  if (backup.baseRevision !== options.initialRevision && !isOwnLostSave) {
    return {
      ...serverCopy,
      notice: "Bài làm đã được lưu mới hơn từ tab hoặc thiết bị khác. Đang dùng bản mới nhất.",
      shouldDiscardBackup: true,
    };
  }
  try {
    return {
      draft: parseAttemptDraft(options.views, backup.draft),
      status: "pending",
      notice: "Đã khôi phục câu trả lời chưa kịp lưu trên máy này.",
      shouldDiscardBackup: false,
    };
  } catch {
    return { ...serverCopy, shouldDiscardBackup: true };
  }
}

export interface SubmitOutcome {
  isSubmitted: boolean;
  resultsUrl?: string;
  message?: string;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await response.json();
    return data && typeof data === "object" ? { ...data } : {};
  } catch {
    return {};
  }
}

const SUBMIT_MESSAGES: Record<string, string> = {
  conflict: "Bài làm vừa được lưu từ tab khác. Tải bản mới nhất rồi nộp lại.",
  closed: "Giáo viên đã đóng bài này nên không nộp được nữa.",
  past_due: "Đã quá hạn và bài không cho nộp muộn.",
  not_found: "Không tìm thấy lượt làm bài này.",
};

export function useDraftSync(options: DraftSyncOptions) {
  const router = useRouter();
  const [initial] = useState(() => restoreDraft(options));
  const [draft, setDraft] = useState(initial.draft);
  const [status, setStatus] = useState<SyncStatus>(initial.status);
  const [savedAt, setSavedAt] = useState(options.initialSavedAt);
  const [notice, setNotice] = useState(initial.notice);

  const key = localDraftKey(options.userId, options.submissionId);
  const draftRef = useRef(initial.draft);
  const revisionRef = useRef(options.initialRevision);
  const statusRef = useRef<SyncStatus>(initial.status);
  const changeRef = useRef(initial.status === "pending" ? 1 : 0);
  const savedChangeRef = useRef(0);
  const savingRef = useRef<Promise<void> | null>(null);
  const timerRef = useRef<number | null>(null);
  const viewsRef = useRef(options.views);
  const unconfirmedRef = useRef<{ draft: AttemptDraft; change: number }[]>([]);

  const updateStatus = useCallback((next: SyncStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const backupLocally = useCallback(
    (next: AttemptDraft) => {
      writeLocalDraft(key, {
        baseRevision: revisionRef.current,
        draft: next,
        unconfirmed: unconfirmedRef.current.map((sent) => sent.draft),
        changedAt: new Date().toISOString(),
      });
    },
    [key],
  );

  // Sends the latest draft once; returns false when autosave has to stop.
  const sendDraft = useCallback(async () => {
    const change = changeRef.current;
    const sent = draftRef.current;
    const body = JSON.stringify({ revision: revisionRef.current, draft: sent });
    updateStatus("saving");
    try {
      const response = await fetch(`/api/submissions/${options.submissionId}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await readJson(response);
      // A conflict whose server copy is a draft this browser sent earlier means that save
      // went through and only its reply was lost; carry on from the server's revision.
      const lostSave =
        response.status === 409 && data.code === "conflict"
          ? unconfirmedRef.current.find((item) =>
              isSameAttemptDraft(viewsRef.current, item.draft, data.draft),
            )
          : undefined;
      const savedChange = lostSave ? lostSave.change : change;
      if ((response.ok || lostSave) && typeof data.revision === "number") {
        revisionRef.current = data.revision;
        savedRevisions.set(options.submissionId, data.revision);
        savedChangeRef.current = savedChange;
        unconfirmedRef.current = [];
        setSavedAt(typeof data.savedAt === "string" ? data.savedAt : new Date().toISOString());
        if (changeRef.current === savedChange) {
          removeLocalDraft(key);
          updateStatus("saved");
        } else {
          backupLocally(draftRef.current);
          updateStatus("pending");
        }
        return true;
      }
      if (response.status === 401) {
        updateStatus("signed_out");
        return false;
      }
      const code = typeof data.code === "string" ? data.code : "";
      updateStatus(BLOCKING_STATUSES.find((item) => item === code) ?? "error");
      return false;
    } catch {
      // The request may still have reached the server, so remember what was sent.
      unconfirmedRef.current = [...unconfirmedRef.current, { draft: sent, change }].slice(
        -MAX_UNCONFIRMED,
      );
      backupLocally(draftRef.current);
      updateStatus("offline");
      return false;
    }
  }, [backupLocally, key, options.submissionId, updateStatus]);

  const save = useCallback(async () => {
    if (savingRef.current) {
      // The running loop also picks up changes made while its request was in flight.
      await savingRef.current;
      return;
    }
    const run = (async () => {
      while (
        !BLOCKING_STATUSES.includes(statusRef.current) &&
        changeRef.current !== savedChangeRef.current
      ) {
        if (!(await sendDraft())) {
          return;
        }
      }
    })();
    savingRef.current = run;
    await run;
    savingRef.current = null;
  }, [sendDraft]);

  const schedule = useCallback(
    (delay: number) => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void save();
      }, delay);
    },
    [save],
  );

  useEffect(() => {
    // The fresh page remounts the runner (it is keyed by submission and revision).
    if (initial.status === "stale") {
      router.refresh();
    }
    if (initial.shouldDiscardBackup) {
      removeLocalDraft(key);
    }
    if (statusRef.current === "pending") {
      schedule(0);
    }
    function handleOnline() {
      if (statusRef.current === "offline" || statusRef.current === "error") {
        statusRef.current = "pending";
        schedule(0);
      }
    }
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [initial.shouldDiscardBackup, initial.status, key, router, schedule]);

  // Accepts an updater so asynchronous events (such as a listen starting) never apply
  // changes to a draft captured before newer typing.
  const updateDraft = useCallback(
    (change: AttemptDraft | ((current: AttemptDraft) => AttemptDraft)) => {
      const next = typeof change === "function" ? change(draftRef.current) : change;
      draftRef.current = next;
      changeRef.current += 1;
      setDraft(next);
      backupLocally(next);
      if (BLOCKING_STATUSES.includes(statusRef.current)) {
        return;
      }
      updateStatus("pending");
      schedule(SAVE_DELAY_MS);
    },
    [backupLocally, schedule, updateStatus],
  );

  // Saves immediately, e.g. when the learner moves to another question.
  const flush = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (statusRef.current === "pending" || savingRef.current) {
      await save();
    }
  }, [save]);

  const retry = useCallback(() => {
    if (statusRef.current === "offline" || statusRef.current === "error") {
      statusRef.current = "pending";
      void save();
    }
  }, [save]);

  const discardLocalCopy = useCallback(() => {
    removeLocalDraft(key);
    setNotice("");
  }, [key]);

  const submit = useCallback(async (): Promise<SubmitOutcome> => {
    // A save that failed earlier is retried first, so submit uses the server's revision.
    if (statusRef.current === "offline" || statusRef.current === "error") {
      statusRef.current = "pending";
    }
    await flush();
    if (BLOCKING_STATUSES.includes(statusRef.current) && statusRef.current !== "submitted") {
      return { isSubmitted: false, message: SUBMIT_MESSAGES[statusRef.current] };
    }
    try {
      const response = await fetch(`/api/submissions/${options.submissionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: revisionRef.current, draft: draftRef.current }),
      });
      const data = await readJson(response);
      if (response.ok && typeof data.resultsUrl === "string") {
        removeLocalDraft(key);
        updateStatus("submitted");
        return { isSubmitted: true, resultsUrl: data.resultsUrl };
      }
      if (response.status === 401) {
        updateStatus("signed_out");
        return { isSubmitted: false, message: "Phiên đăng nhập đã hết. Đăng nhập lại rồi nộp." };
      }
      const code = typeof data.code === "string" ? data.code : "";
      const blocking = BLOCKING_STATUSES.find((item) => item === code);
      if (blocking) {
        updateStatus(blocking);
      }
      return {
        isSubmitted: false,
        message:
          SUBMIT_MESSAGES[code] ?? "Chưa nộp được. Câu trả lời vẫn được giữ, bạn thử lại nhé.",
      };
    } catch {
      return {
        isSubmitted: false,
        message: "Mất kết nối nên chưa nộp được. Câu trả lời vẫn được giữ, thử lại khi có mạng.",
      };
    }
  }, [flush, key, options.submissionId, updateStatus]);

  // The draft including changes made in this same event, before React renders them: Enter in an
  // answer field finishes a trailing romaji "n" and checks the answer in one keystroke.
  const readDraft = useCallback(() => draftRef.current, []);

  return {
    draft,
    status,
    savedAt,
    notice,
    updateDraft,
    readDraft,
    flush,
    retry,
    submit,
    discardLocalCopy,
  };
}
