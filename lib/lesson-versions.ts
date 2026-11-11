// Every publish adds a version that classes, assignments, submissions and shares may point at, so
// old versions stay in the database. A teacher picking a version usually wants the newest one or
// the one already in use; the rest wait behind a "show older versions" choice.
export function versionChoices<Version extends { id: string }>(
  newestFirst: readonly Version[],
  inUseIds: readonly (string | null | undefined)[],
  showOlder: boolean,
) {
  const kept = new Set([newestFirst[0]?.id, ...inUseIds]);
  const usual = newestFirst.filter((version) => kept.has(version.id));
  return {
    offered: showOlder ? [...newestFirst] : usual,
    olderCount: newestFirst.length - usual.length,
    newestId: newestFirst[0]?.id,
  };
}
