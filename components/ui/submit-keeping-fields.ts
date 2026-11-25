import { startTransition } from "react";

import type { FormEvent } from "react";

// A function passed to <form action> resets the form's fields when it returns: a controlled select
// or radio falls back to the option the server rendered while React state keeps the user's choice,
// so the next submit sends something else than the form shows. Submitting through a transition
// keeps every field as it is; the action's pending state and result work the same.
export function submitKeepingFields(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };
}
