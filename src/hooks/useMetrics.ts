import { useCallback, useEffect, useState } from 'react';
import { metricsAPI, ProjectMetrics } from '../api/client';
import useSocket from './useSocket';

export default function useMetrics(projectId: string, days = 30) {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await metricsAPI.get(projectId, days);
      setMetrics(res.data.metrics);
    } catch (err: any) {
      console.error('load metrics', err);
      setError(err?.response?.data?.error || err?.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [projectId, days]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch metrics when tasks change (flow events)
  useSocket(projectId, {
    'task:created': () => load(),
    'task:updated': () => load(),
    'task:moved': () => load(),
    'task:deleted': () => load(),
    'tasks:reordered': () => load(),
    'project:columns-updated': () => load(),
  });

  return { metrics, loading, error, reload: load };
}
