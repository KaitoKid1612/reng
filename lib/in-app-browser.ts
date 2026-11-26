// Chat and social apps open links in their own embedded browser. Google refuses to sign in there
// (error 403 disallowed_useragent), and invite links mostly travel through Zalo and Messenger.
const IN_APP_BROWSERS = [
  /Zalo/i,
  /FBAN|FBAV|FB_IAB|FBIOS|Messenger/i,
  /Instagram/i,
  /\bLine\//i,
  /musical_ly|BytedanceWebview|TikTok/i,
  // Any other app on Android that shows pages in a WebView.
  /; wv\)/,
];

export function isInAppBrowser(userAgent: string | null | undefined) {
  return Boolean(userAgent) && IN_APP_BROWSERS.some((pattern) => pattern.test(userAgent ?? ""));
}
