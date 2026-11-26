"use client";

import { Children, useEffect, useSyncExternalStore } from "react";

import type { ReactNode } from "react";

export interface SwitcherGroup {
  id: string;
  title: string;
  count: number;
}

interface GroupSwitcherProps {
  // Name of the chip row for screen readers, e.g. "Chủ đề".
  label: string;
  // Word for the counted items, e.g. "từ" or "chữ", and for a group, e.g. "Chủ đề" or "Nhóm".
  unit: string;
  groupWord: string;
  groups: readonly SwitcherGroup[];
  // One server-rendered section per group, in the same order; each is the element with the
  // group's id, so #<group id> links keep working.
  children: ReactNode;
}

const ALL = "tat-ca";
const hashListeners = new Set<() => void>();

function subscribeHash(listener: () => void) {
  hashListeners.add(listener);
  window.addEventListener("hashchange", listener);
  return () => {
    hashListeners.delete(listener);
    window.removeEventListener("hashchange", listener);
  };
}

function readHash() {
  return decodeURIComponent(window.location.hash.slice(1));
}

function showHash(id: string) {
  window.history.replaceState(null, "", `#${encodeURIComponent(id)}`);
  for (const listener of hashListeners) {
    listener();
  }
}

/**
 * Long self-study lists (388 N4 words, 105 N5 kanji) show one group at a time instead of one
 * 50 000px page: the chips choose the group, "Tất cả" shows every group, and the page address keeps
 * the choice (#<group id>), so a shared link or the back button opens the same group. A link to
 * one item (#vocab-…) opens the group holding it. The first group shows before the script runs.
 */
export function GroupSwitcher({ label, unit, groupWord, groups, children }: GroupSwitcherProps) {
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const target = groups.some((group) => group.id === hash) || hash === ALL ? hash : "";
  // A hash naming an item inside a group (not a group) opens that group.
  const itemGroup = useSyncExternalStore(
    subscribeHash,
    () =>
      target || !hash
        ? ""
        : (document.getElementById(hash)?.closest("[data-switcher-group]")?.id ?? ""),
    () => "",
  );
  const active = target || itemGroup || groups[0]?.id;
  const sections = Children.toArray(children);
  const index = groups.findIndex((group) => group.id === active);
  const next = index >= 0 ? groups[index + 1] : undefined;
  const total = groups.reduce((sum, group) => sum + group.count, 0);

  // Once the item's group is shown, bring the item into view (it was hidden when the page loaded).
  useEffect(() => {
    if (itemGroup) {
      document.getElementById(hash)?.scrollIntoView({ block: "center" });
    }
  }, [hash, itemGroup]);

  function choose(id: string) {
    showHash(id);
    document.getElementById("group-switcher-top")?.scrollIntoView({ block: "start" });
  }

  return (
    <>
      <nav className="kanji-group-nav" aria-label={label} id="group-switcher-top">
        <ul>
          {groups.map((group) => (
            <li key={group.id}>
              <a
                href={`#${group.id}`}
                aria-current={active === group.id ? "true" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  choose(group.id);
                }}
              >
                {group.title} <span className="kanji-count">({group.count})</span>
              </a>
            </li>
          ))}
          <li>
            <a
              href={`#${ALL}`}
              aria-current={active === ALL ? "true" : undefined}
              onClick={(event) => {
                event.preventDefault();
                choose(ALL);
              }}
            >
              Tất cả <span className="kanji-count">({total})</span>
            </a>
          </li>
        </ul>
      </nav>
      {sections.map((section, position) => {
        const group = groups[position];
        return (
          <div
            key={group?.id ?? position}
            hidden={active !== ALL && group?.id !== active}
            className="group-switcher-panel"
          >
            {section}
          </div>
        );
      })}
      {next && active !== ALL && (
        <p className="group-switcher-next">
          <a
            href={`#${next.id}`}
            onClick={(event) => {
              event.preventDefault();
              choose(next.id);
            }}
          >
            {`${groupWord} tiếp theo: ${next.title} (${next.count} ${unit})`}
          </a>
        </p>
      )}
    </>
  );
}
