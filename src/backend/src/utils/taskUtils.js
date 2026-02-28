/**
 * Determine the position of a column within the project's column list.
 * Returns { isFirst, isLast, order } or null if column not found.
 */
export function getColumnPosition(project, columnKey) {
  const sorted = [...project.columns].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((c) => c.key === columnKey);
  if (idx === -1) return null;
  return {
    isFirst: idx === 0,
    isLast: idx === sorted.length - 1,
    order: sorted[idx].order,
  };
}

/**
 * Auto-set flow timestamps based on column position.
 * Mutates the task document in place.
 * - committedAt: set when a task first enters any board column
 * - startedAt:   set when a task enters a column past the first
 * - completedAt: set when a task enters the last column
 * Manual overrides are preserved (never overwrite existing timestamps).
 */
export function applyAutoTimestamps(task, project, toColumnKey) {
  const pos = getColumnPosition(project, toColumnKey);
  if (!pos) return;

  const now = new Date();

  if (!task.committedAt) {
    task.committedAt = now;
  }
  if (!pos.isFirst && !task.startedAt) {
    task.startedAt = now;
  }
  if (pos.isLast && !task.completedAt) {
    task.completedAt = now;
  }
}
