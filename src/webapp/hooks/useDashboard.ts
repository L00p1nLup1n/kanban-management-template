import { useState, useEffect, useCallback } from 'react';
import { dashboardAPI, DashboardData } from '../api/client';

export function useDashboard(days = 30) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardAPI.get(days);
      setDashboard(res.data.dashboard);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  return { dashboard, loading, error, reload: load };
}
