/**
 * Compute avg, median, p85, min, max from an array of numbers.
 */
export function computeStats(values) {
  if (values.length === 0) {
    return { avg: 0, median: 0, p85: 0, min: 0, max: 0, count: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const avg =
    Math.round((sorted.reduce((s, v) => s + v, 0) / sorted.length) * 10) / 10;
  const median = Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10;
  const p85 = Math.round(sorted[Math.floor(sorted.length * 0.85)] * 10) / 10;
  const min = Math.round(sorted[0] * 10) / 10;
  const max = Math.round(sorted[sorted.length - 1] * 10) / 10;
  return { avg, median, p85, min, max, count: sorted.length };
}
