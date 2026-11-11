"use client";

interface HeadScriptProps {
  code: string;
}

// An inline script that runs while the server HTML is parsed, before the first paint. The browser
// never needs the tag again: React does not run a <script> it creates itself and warns when it
// does, which happened whenever a page's notFound() mounted the root layout again in the browser.
// Hydration leaves the server's tag in <head> alone.
export function HeadScript({ code }: HeadScriptProps) {
  if (typeof window !== "undefined") {
    return null;
  }
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
