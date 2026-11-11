// How a long set is shown on a wide screen: one question at a time (as on a phone) or all at once.
// The choice is kept per browser; phones always show one question.
export type AttemptView = "single" | "all";

const ATTEMPT_VIEW_KEY = "reng-attempt-view";

export function readAttemptView(): AttemptView {
  try {
    return localStorage.getItem(ATTEMPT_VIEW_KEY) === "all" ? "all" : "single";
  } catch {
    return "single";
  }
}

// Storage can be blocked; the choice then lasts for this page only.
export function saveAttemptView(view: AttemptView) {
  try {
    localStorage.setItem(ATTEMPT_VIEW_KEY, view);
  } catch {
    // Nothing else depends on it.
  }
}
