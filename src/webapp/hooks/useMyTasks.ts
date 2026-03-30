import { useEffect, useState, useCallback } from 'react';
import { myTasksAPI, MyTasksProject } from '../api/client';

export function useMyTasks() {
  const [projects, setProjects] = useState<MyTasksProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await myTasksAPI.list();
      setProjects(data.projects);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { projects, loading, error, reload };
}
