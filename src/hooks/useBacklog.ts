import { useCallback, useEffect, useState } from 'react';
import { tasksAPI, PopulatedUser } from '../api/client';
import useSocket from './useSocket';

interface BacklogTask {
  _id: string;
  title: string;
  description?: string;
  color?: string;
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: string;
  assignee?: PopulatedUser;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BacklogTaskModel {
  id: string;
  title: string;
  description?: string;
  color: string;
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: string;
  assignee?: PopulatedUser;
  dueDate?: string;
  createdAt: string;
}

function mapServerTaskToModel(t: BacklogTask): BacklogTaskModel {
  return {
    id: t._id,
    title: t.title,
    description: t.description,
    color: t.color || '#F7FAFC',
    priority: t.priority as BacklogTaskModel['priority'],
    assigneeId: t.assigneeId,
    assignee: t.assignee,
    dueDate: t.dueDate,
    createdAt: t.createdAt,
  };
}

export default function useBacklog(projectId: string) {
  const [tasks, setTasks] = useState<BacklogTaskModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await tasksAPI.backlog(projectId);
      const backlogTasks: BacklogTask[] = res.data.tasks || [];
      setTasks(backlogTasks.map(mapServerTaskToModel));
    } catch (err: any) {
      console.error('Load backlog error:', err);
      setError(err?.response?.data?.error || 'Failed to load backlog');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // Subscribe to real-time updates
  useSocket(projectId, {
    'task:created': () => load(),
    'task:updated': () => load(),
    'task:moved': () => load(),
    'task:deleted': () => load(),
  });

  const createTask = useCallback(
    async (data: {
      title: string;
      description?: string;
      priority?: 'low' | 'medium' | 'high';
    }) => {
      try {
        await tasksAPI.createBacklog(projectId, data);
        await load();
      } catch (err: any) {
        console.error('Create backlog task error:', err);
        throw err;
      }
    },
    [projectId, load],
  );

  const updateTask = useCallback(
    async (taskId: string, patch: Partial<BacklogTaskModel>) => {
      try {
        const data: any = {};
        if (patch.title !== undefined) data.title = patch.title;
        if (patch.description !== undefined)
          data.description = patch.description;
        if (patch.color !== undefined) data.color = patch.color;
        if (patch.priority !== undefined) data.priority = patch.priority;
        if (patch.assigneeId !== undefined)
          data.assigneeId = patch.assigneeId || undefined;
        if (patch.dueDate !== undefined)
          data.dueDate = patch.dueDate || undefined;

        await tasksAPI.update(projectId, taskId, data);
        await load();
      } catch (err) {
        console.error('Update backlog task error:', err);
        throw err;
      }
    },
    [projectId, load],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      try {
        await tasksAPI.delete(projectId, taskId);
        await load();
      } catch (err) {
        console.error('Delete backlog task error:', err);
        throw err;
      }
    },
    [projectId, load],
  );

  const moveToColumn = useCallback(
    async (taskId: string, columnKey: string) => {
      try {
        await tasksAPI.move(projectId, taskId, { toColumnKey: columnKey });
        await load();
      } catch (err) {
        console.error('Move to column error:', err);
        throw err;
      }
    },
    [projectId, load],
  );

  return {
    tasks,
    loading,
    error,
    load,
    createTask,
    updateTask,
    deleteTask,
    moveToColumn,
  };
}
