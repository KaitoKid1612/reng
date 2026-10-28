import type { ActionState } from "@/app/actions/classes";

interface ActionFeedbackProps {
  state: ActionState;
}

export function ActionFeedback({ state }: ActionFeedbackProps) {
  if (state.error) {
    return (
      <p role="alert" className="error-text">
        {state.error}
      </p>
    );
  }
  if (state.notice) {
    return (
      <p role="status" className="form-notice">
        {state.notice}
      </p>
    );
  }
  return null;
}
