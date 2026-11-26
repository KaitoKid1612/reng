"use client";

import { useSyncExternalStore } from "react";

import { findNextJlptSession } from "@/lib/jlpt-sessions";
import { formatStudyDay, toStudyDay } from "@/lib/study-days";

// Holds the session date the person hid the bar for, so it comes back for the next session.
const HIDDEN_KEY = "reng-jlpt-countdown-hidden";
// Set while the signed-in account has a Japanese class, so the bar shows as the next page loads
// instead of after the account does.
const SHOWN_KEY = "reng-jlpt-countdown-shown";
const CHANGE_EVENT = "reng-jlpt-countdown-change";
const MINUTE_MS = 60 * 1000;

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, MINUTE_MS);
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

function readHiddenSession() {
  try {
    return localStorage.getItem(HIDDEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function readShown() {
  try {
    return localStorage.getItem(SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

function readNotShown() {
  return false;
}

/** The header calls this once it knows the account: only Japanese classes prepare for JLPT. */
export function rememberJlptCountdown(isShown: boolean) {
  if (readShown() === isShown) {
    return;
  }
  try {
    if (isShown) {
      localStorage.setItem(SHOWN_KEY, "1");
    } else {
      localStorage.removeItem(SHOWN_KEY);
    }
  } catch {
    // Without storage the bar stays as it was.
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// The day, not the instant, so the bar re-renders only when the date in Vietnam changes.
function readToday() {
  return toStudyDay(new Date());
}

function readNothing() {
  return null;
}

/**
 * Days to the next JLPT, under the header for people with a Japanese class; guests and Chinese
 * classes do not see it. The server cannot know the visitor's day when the page is cached, so
 * the browser fills it in.
 */
export function JlptCountdown() {
  const today = useSyncExternalStore(subscribe, readToday, readNothing);
  const hiddenSession = useSyncExternalStore(subscribe, readHiddenSession, readNothing);
  const isShown = useSyncExternalStore(subscribe, readShown, readNotShown);
  if (!today || !isShown) {
    return null;
  }
  const session = findNextJlptSession(new Date(`${today}T12:00:00+07:00`));
  if (!session || hiddenSession === session.date) {
    return null;
  }

  const hide = () => {
    try {
      localStorage.setItem(HIDDEN_KEY, session.date);
    } catch {
      // Without storage the bar cannot stay hidden.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <div className="jlpt-countdown">
      <p>
        {session.daysLeft === 0 ? (
          <strong>Hôm nay thi JLPT. Chúc bạn thi tốt!</strong>
        ) : (
          <>
            <strong>Còn {session.daysLeft} ngày</strong>{" "}
            <span className="jlpt-countdown-wide">tới kỳ thi JLPT</span>
            <span className="jlpt-countdown-narrow">tới JLPT</span>
          </>
        )}
        <span className="jlpt-countdown-date">
          <span className="jlpt-countdown-wide">Chủ nhật {formatStudyDay(session.date)}</span>
          <span className="jlpt-countdown-narrow">{formatStudyDay(session.date).slice(0, 5)}</span>
          {session.isConfirmed ? "" : " (dự kiến)"}
        </span>
      </p>
      <button type="button" onClick={hide} aria-label="Ẩn đếm ngược JLPT tới kỳ sau">
        Ẩn
      </button>
    </div>
  );
}
