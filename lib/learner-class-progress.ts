export interface ClassWorkProgress {
  submitted: number;
  // Work given to the class so far; lessons not open yet do not count.
  total: number;
}

interface ClassWorkItem {
  classId: string;
  status: string;
}

// How much of each class's work the learner has handed in, for the class list.
export function countClassWork(items: readonly ClassWorkItem[]) {
  const progress = new Map<string, ClassWorkProgress>();
  for (const item of items) {
    if (item.status === "not_available") {
      continue;
    }
    const current = progress.get(item.classId) ?? { submitted: 0, total: 0 };
    progress.set(item.classId, {
      submitted: current.submitted + (item.status === "submitted" ? 1 : 0),
      total: current.total + 1,
    });
  }
  return progress;
}
