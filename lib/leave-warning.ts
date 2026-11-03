interface LinkTarget {
  href: string;
  target: string;
  hasDownload: boolean;
}

interface ClickModifiers {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

// A plain left click on a link to another page of this site replaces the editor in the same tab
// without unloading it, so the browser's own unsaved-changes prompt never appears. New tabs,
// downloads and same-page anchors keep the editor open; other sites unload the page and get the
// browser prompt instead.
export function isInPlaceNavigation(link: LinkTarget, click: ClickModifiers, currentHref: string) {
  const opensElsewhere = link.hasDownload || (link.target !== "" && link.target !== "_self");
  const hasModifier = click.metaKey || click.ctrlKey || click.shiftKey || click.altKey;
  if (opensElsewhere || hasModifier || click.button !== 0) {
    return false;
  }
  const current = new URL(currentHref);
  const next = new URL(link.href, currentHref);
  return (
    next.origin === current.origin &&
    (next.pathname !== current.pathname || next.search !== current.search)
  );
}
