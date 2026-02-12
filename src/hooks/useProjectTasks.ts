import { useCallback, useEffect, useState } from 'react';
import {
  projectsAPI,
  tasksAPI,
  Column as APIColumn,
  PopulatedUser,
} from '../api/client';
import useSocket from './useSocket';
import { ColumnType } from '../utils/enums';
import { TaskModel } from '../utils/models';
import pickChakraRandomColor from '../helpers/pickChakraRandomColor';

type ColumnsMap = Record<string, TaskModel[]>;

export interface ProjectColumn {
  id?: string;
  key: string;
  title: string;
  order?: number;
  wip?: number;
}

interface ServerTask {
  _id: string;
  title: string;
  columnKey?: string;
  color?: string;
  order?: number;
  backlog?: boolean;
  priority?: 'low' | 'medium' | 'high';
  assigneeId?: string;
  assignee?: PopulatedUser;
  dueDate?: string;
  committedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

function mapServerTaskToModel(t: ServerTask): TaskModel {
  const columnKey = t.columnKey || 'to-do';
  return {
    id: t._id,
    title: t.title,
    column: columnKey,
    // If server provided color, use it; otherwise derive deterministic color from task id
    color: t.color || pickChakraRandomColor(t._id, '.200') || '#F7FAFC',
    priority: t.priority as TaskModel['priority'],
    assigneeId: t.assigneeId,
    assignee: t.assignee,
    dueDate: t.dueDate,
    committedAt: t.committedAt,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
  };
}

export default function useProjectTasks(projectId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{
    status?: number;
    message?: string;
  } | null>(null);
  const [columns, setColumns] = useState<ColumnsMap>(
    Object.values(ColumnType).reduce(
      (acc, k) => ({ ...acc, [k]: [] as TaskModel[] }),
      {} as ColumnsMap,
    ),
  );
  const [projectName, setProjectName] = useState<string | null>(null);
  const [projectColumns, setProjectColumns] = useState<ProjectColumn[]>([]);
  const [projectOwnerId, setProjectOwnerId] = useState<
    string | PopulatedUser | null
  >(null);
  const [projectMembers, setProjectMembers] = useState<
    (string | PopulatedUser)[]
  >([]);
  const [joinCode, setJoinCode] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, tRes] = await Promise.all([
        projectsAPI.get(projectId),
        tasksAPI.list(projectId),
      ]);

      const project = pRes.data?.project;
      setProjectName(project?.name || null);
      setProjectOwnerId(project?.ownerId || null);
      setProjectMembers(project?.members || []);
      setJoinCode(project?.joinCode);
      // Use server columns directly (no backlog pseudo-column)
      const serverCols: ProjectColumn[] = project?.columns || [];
      setProjectColumns(serverCols);

      const tasks: ServerTask[] = tRes.data.tasks || [];

      const map: ColumnsMap = {};

      // map board tasks only (backlog is now on separate page)
      tasks.forEach((t) => {
        const tm = mapServerTaskToModel(t);
        if (!map[tm.column]) map[tm.column] = [];
        map[tm.column].push(tm);
      });

      // ensure default columns exist even if no tasks yet
      Object.values(ColumnType).forEach((k) => {
        if (!map[k]) map[k] = [];
      });

      // sort tasks in each column by priority (high -> medium -> low)
      // then tie-break by title for stable ordering
      const priorityValue = (p?: TaskModel['priority']) =>
        p === 'high' ? 3 : p === 'medium' ? 2 : p === 'low' ? 1 : 0;
      (Object.keys(map) as Array<keyof ColumnsMap>).forEach((k) => {
        map[k].sort((a, b) => {
          const pa = priorityValue(a.priority);
          const pb = priorityValue(b.priority);
          if (pa !== pb) return pb - pa; // higher priority first
          // final tie-break: alphabetical by title
          return String(a.title || '').localeCompare(String(b.title || ''));
        });
      });

      setColumns(map);
    } catch (err: any) {
      console.error('load project tasks', err);
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error || err?.message || 'Failed to load project';
      setError({ status, message });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // subscribe to realtime updates for this project and reload on changes
  useSocket(projectId, {
    'task:created': () => load(),
    'task:updated': () => load(),
    'task:moved': () => load(),
    'task:deleted': () => load(),
    'tasks:reordered': () => load(),
    // project-level column changes (add/remove/reorder columns)
    'project:columns-updated': () => load(),
    // member removed from project
    'project:member-removed': () => load(),
    // member joined project
    'project:member-joined': () => load(),
  });
  type CreateTaskPayload = {
    title: string;
    columnKey: string;
    order: number;
    priority?: 'low' | 'medium' | 'high';
  };

  const createTask = useCallback(
    async (data: {
      title?: string;
      column: string;
      priority?: 'low' | 'medium' | 'high';
    }) => {
      const payload: CreateTaskPayload = {
        title: data.title || 'New task',
        columnKey: data.column,
        order: 1000,
        priority: data.priority,
      };

      try {
        await tasksAPI.create(projectId, payload);
        await load();
      } catch (err) {
        console.error('create task', err);
        throw err;
      }
    },
    [projectId, load],
  );

  type UpdateTaskPayload = {
    title?: string;
    columnKey?: string;
    color?: string;
    priority?: 'low' | 'medium' | 'high';
    assigneeId?: string;
    dueDate?: string;
    committedAt?: string;
    startedAt?: string;
    completedAt?: string;
  };

  const updateTask = useCallback(
    async (taskId: string, patch: Partial<TaskModel>) => {
      try {
        const data: UpdateTaskPayload = {};
        if (patch.title !== undefined) data.title = patch.title;
        if (patch.column !== undefined) data.columnKey = patch.column;
        if (patch.color !== undefined) data.color = patch.color;
        if (patch.priority !== undefined) data.priority = patch.priority;
        if (patch.assigneeId !== undefined)
          data.assigneeId = patch.assigneeId || undefined;
        if (patch.dueDate !== undefined)
          data.dueDate = patch.dueDate || undefined;
        if (patch.committedAt !== undefined)
          data.committedAt = patch.committedAt;
        if (patch.startedAt !== undefined) data.startedAt = patch.startedAt;
        if (patch.completedAt !== undefined)
          data.completedAt = patch.completedAt;
        await tasksAPI.update(projectId, taskId, data);
        await load();
      } catch (err) {
        console.error('update task', err);
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
        console.error('delete task', err);
        throw err;
      }
    },
    [projectId, load],
  );

  const moveTask = useCallback(
    async (from: string, to: string, taskId: string) => {
      try {
        if (to === 'backlog') {
          await tasksAPI.move(projectId, taskId, { backlog: true });
        } else {
          await tasksAPI.move(projectId, taskId, { toColumnKey: to });
        }
        await load();
      } catch (err) {
        console.error('move task', err);
        throw err;
      }
    },
    [projectId, load],
  );

  const reorder = useCallback(
    async (tasks: Array<{ id: string; order: number; columnKey?: string }>) => {
      try {
        await tasksAPI.reorder(projectId, tasks);
        await load();
      } catch (err) {
        console.error('reorder tasks', err);
        throw err;
      }
    },
    [projectId, load],
  );

  const saveProjectColumns = useCallback(
    async (cols: ProjectColumn[]) => {
      try {
        // Map columns directly (backlog is no longer a pseudo-column)
        const mapped: APIColumn[] = cols.map((c, idx) => ({
          id: c.id || `${c.key}-${idx}`,
          key: c.key,
          title: c.title,
          order: c.order || idx,
          wip: c.wip,
        }));
        await projectsAPI.update(projectId, { columns: mapped });
        await load();
      } catch (err) {
        console.error('save project columns', err);
        throw err;
      }
    },
    [projectId, load],
  );

  return {
    columns,
    loading,
    error,
    load,
    projectName,
    projectColumns,
    projectOwnerId,
    projectMembers,
    joinCode,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    reorder,
    saveProjectColumns,
  };
}
