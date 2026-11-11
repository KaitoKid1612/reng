// The header learns who is signed in from /api/me after hydration, so the server-rendered page
// shows the guest menu first. This browser remembers that someone signed in here before; a tiny
// script in the root layout marks <html> with it before the first paint, and the header CSS hides
// the guest-only links until the real answer arrives.
const ACCOUNT_HINT_KEY = "reng-signed-in";
const ACCOUNT_HINT_ATTRIBUTE = "account";

export const ACCOUNT_HINT_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(ACCOUNT_HINT_KEY)})==="1"){document.documentElement.dataset.${ACCOUNT_HINT_ATTRIBUTE}="member"}}catch(e){}`;

// Storage can be missing or blocked (private windows, strict settings); the hint is only a
// convenience, so failures are ignored.
export function rememberAccountHint(isSignedIn: boolean) {
  try {
    if (isSignedIn) {
      localStorage.setItem(ACCOUNT_HINT_KEY, "1");
      document.documentElement.dataset[ACCOUNT_HINT_ATTRIBUTE] = "member";
    } else {
      localStorage.removeItem(ACCOUNT_HINT_KEY);
      delete document.documentElement.dataset[ACCOUNT_HINT_ATTRIBUTE];
    }
  } catch {
    // The menu still corrects itself once /api/me answers.
  }
}
