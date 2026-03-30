/**
 * Classify project health based on WIP concerns, aging tasks, and throughput.
 *
 * - blocked: column over WIP limit AND tasks aging > 5 days
 * - at_risk: column at/over WIP limit, OR task aging > 3 days,
 *            OR zero throughput in last 7 days with in-progress tasks
 * - on_track: everything else
 */
export function classifyProjectHealth(
  wipConcerns,
  agingTasks,
  throughputAvg,
  hasInProgress,
) {
  const reasons = [];

  const overLimitColumns = wipConcerns.filter(
    (w) => w.limit && w.count > w.limit,
  );
  const severelyAgingTasks = agingTasks.filter((t) => t.ageHours > 120); // > 5 days
  const moderatelyAgingTasks = agingTasks.filter((t) => t.ageHours > 72); // > 3 days

  // Blocked: over WIP limit AND severe aging
  if (overLimitColumns.length > 0 && severelyAgingTasks.length > 0) {
    overLimitColumns.forEach((w) =>
      reasons.push(
        `WIP limit exceeded on "${w.title}" (${w.count}/${w.limit})`,
      ),
    );
    reasons.push(`${severelyAgingTasks.length} task(s) aging over 5 days`);
    return { health: 'blocked', healthReasons: reasons };
  }

  // At risk checks
  const atLimitColumns = wipConcerns.filter(
    (w) => w.limit && w.count >= w.limit,
  );
  if (atLimitColumns.length > 0) {
    atLimitColumns.forEach((w) =>
      reasons.push(`WIP at/over limit on "${w.title}" (${w.count}/${w.limit})`),
    );
  }
  if (moderatelyAgingTasks.length > 0) {
    reasons.push(`${moderatelyAgingTasks.length} task(s) aging over 3 days`);
  }
  if (throughputAvg === 0 && hasInProgress) {
    reasons.push('Zero throughput in period with in-progress tasks');
  }

  if (reasons.length > 0) {
    return { health: 'at_risk', healthReasons: reasons };
  }

  return { health: 'on_track', healthReasons: [] };
}
