import { useCallback, useEffect, useState } from 'react';
import { projectsAPI, tasksAPI, Column as APIColumn } from '../api/client';
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
}

function mapServerTaskToModel(t: ServerTask): TaskModel {
    const columnKey = t.backlog ? 'backlog' : (t.columnKey || 'backlog');
    return {
        id: t._id,
        title: t.title,
        column: columnKey,
        color: t.color || pickChakraRandomColor('.200') || '#F7FAFC',
    };
}

export default function useProjectTasks(projectId: string) {
    const [loading, setLoading] = useState(false);
    const [columns, setColumns] = useState<ColumnsMap>(
        Object.values(ColumnType).reduce((acc, k) => ({ ...acc, [k]: [] as TaskModel[] }), {} as ColumnsMap)
    );
    const [projectName, setProjectName] = useState<string | null>(null);
    const [projectColumns, setProjectColumns] = useState<ProjectColumn[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [pRes, tRes, bRes] = await Promise.all([
                projectsAPI.get(projectId),
                tasksAPI.list(projectId),
                tasksAPI.backlog(projectId),
            ]);

            const project = pRes.data?.project;
            setProjectName(project?.name || null);
            // Ensure backlog column is present as the first persistent column
            const serverCols: ProjectColumn[] = project?.columns || [];
            const backlogCol: ProjectColumn = { id: 'backlog', key: 'backlog', title: 'Backlog', order: -1 };
            const combinedCols = [backlogCol, ...serverCols.filter((c: ProjectColumn) => c.key !== 'backlog')];
            setProjectColumns(combinedCols);

            const tasks: ServerTask[] = tRes.data.tasks || [];
            const backlogTasks: ServerTask[] = bRes.data.tasks || [];

            const map: ColumnsMap = {};

            // map board tasks
            tasks.forEach((t) => {
                const tm = mapServerTaskToModel(t);
                if (!map[tm.column]) map[tm.column] = [];
                map[tm.column].push(tm);
            });
            // map backlog tasks under 'backlog' key
            backlogTasks.forEach((t) => {
                const tm = mapServerTaskToModel({ ...t, backlog: true });
                if (!map[tm.column]) map[tm.column] = [];
                map[tm.column].push(tm);
            });

            // ensure default columns exist even if no tasks yet
            Object.values(ColumnType).forEach((k) => {
                if (!map[k]) map[k] = [];
            });

            // sort by server order if present (we typed ServerTask.order above)
            (Object.keys(map) as Array<keyof ColumnsMap>).forEach((k) => {
                map[k].sort((a, b) => 0); // no-op by default (server order not mapped into TaskModel)
            });

            setColumns(map);
        } catch (err) {
            console.error('load project tasks', err);
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
    });
    type CreateTaskPayload = { title: string; columnKey: string; order: number };

    const createTask = useCallback(async (data: { title?: string; column: string }) => {
        const payload: CreateTaskPayload = {
            title: data.title || 'New task',
            columnKey: data.column,
            order: 1000,
        };

        try {
            await tasksAPI.create(projectId, payload);
            await load();
        } catch (err) {
            console.error('create task', err);
            throw err;
        }
    }, [projectId, load]);

    const createBacklogTask = useCallback(async (data: { title: string; description?: string }) => {
        try {
            await tasksAPI.createBacklog(projectId, { title: data.title, description: data.description });
            await load();
        } catch (err) {
            console.error('create backlog task', err);
            throw err;
        }
    }, [projectId, load]);

    type UpdateTaskPayload = { title?: string; columnKey?: string; color?: string };

    const updateTask = useCallback(async (taskId: string, patch: Partial<TaskModel>) => {
        try {
            const data: UpdateTaskPayload = {};
            if (patch.title !== undefined) data.title = patch.title;
            if (patch.column !== undefined) data.columnKey = patch.column;
            if (patch.color !== undefined) data.color = patch.color;
            await tasksAPI.update(projectId, taskId, data);
            await load();
        } catch (err) {
            console.error('update task', err);
            throw err;
        }
    }, [projectId, load]);

    const deleteTask = useCallback(async (taskId: string) => {
        try {
            await tasksAPI.delete(projectId, taskId);
            await load();
        } catch (err) {
            console.error('delete task', err);
            throw err;
        }
    }, [projectId, load]);

    const moveTask = useCallback(async (from: string, to: string, taskId: string) => {
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
    }, [projectId, load]);

    const reorder = useCallback(async (tasks: Array<{ id: string; order: number; columnKey?: string }>) => {
        try {
            await tasksAPI.reorder(projectId, tasks);
            await load();
        } catch (err) {
            console.error('reorder tasks', err);
            throw err;
        }
    }, [projectId, load]);

    const saveProjectColumns = useCallback(async (cols: ProjectColumn[]) => {
        try {
            // Do not persist the internal 'backlog' pseudo-column to the server
            const filtered = cols.filter((c) => c.key !== 'backlog');
            const mapped: APIColumn[] = filtered.map((c, idx) => ({
                id: c.id || `${c.key}-${idx}`,
                key: c.key,
                title: c.title,
                order: c.order || idx,
                // preserve wip if present on APIColumn? APIColumn currently doesn't include wip
            }));
            await projectsAPI.update(projectId, { columns: mapped });
            await load();
        } catch (err) {
            console.error('save project columns', err);
            throw err;
        }
    }, [projectId, load]);

    return {
        columns,
        loading,
        load,
        projectName,
        projectColumns,
        createTask,
        createBacklogTask,
        updateTask,
        deleteTask,
        moveTask,
        reorder,
        saveProjectColumns,
    };
}
