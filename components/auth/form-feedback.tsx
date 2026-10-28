import type { AuthFormState } from "@/app/actions/auth";

interface FormFeedbackProps {
  state: AuthFormState;
}

export function FormFeedback({ state }: FormFeedbackProps) {
  return (
    <>
      {state.error && (
        <p role="alert" className="error-text">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p role="status" className="form-notice">
          {state.notice}
        </p>
      )}
    </>
  );
}
