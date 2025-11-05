import { Box, Grid, Spinner, Heading, IconButton, useToast, Text } from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { ColumnType } from '../../utils/enums';
import ProjectColumn from '../../components/ProjectColumn/ProjectColumn';
import useProjectTasks, { ProjectColumn as ProjectColumnMeta } from '../../hooks/useProjectTasks';
import { TaskModel } from '../../utils/models';
import { useEffect, useState } from 'react';
import ColumnSettingsModal from '../../components/Project/ColumnSettingsModal';
import { SettingsIcon } from '@chakra-ui/icons';
import { useAuth } from '../../hooks/useAuth';

function UsernameDisplay() {
    const { user } = useAuth();
    return <Text fontSize="sm">{user?.name || user?.email || 'Guest'}</Text>;
}

export default function ProjectView() {
    const { projectId } = useParams<{ projectId: string }>();
    const {
        loading,
        columns,
        load,
        createTask,
        createBacklogTask,
        updateTask,
        deleteTask,
        moveTask,
        reorder,
        projectName,
        projectColumns,
        saveProjectColumns,
    } = useProjectTasks(projectId || '');
    // local optimistic copy used for snappy hover reordering
    const toast = useToast();
    const [colsLocal, setColsLocal] = useState(columns);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        setColsLocal(columns);
    }, [columns]);

    if (loading) return <Spinner />;

    const handleCreate = (column: string) => {
        // enforce WIP
        const colMeta = projectColumns.find((c: ProjectColumnMeta) => c.key === column);
        const wip = colMeta?.wip;
        const count = colsLocal[column]?.length || 0;
        if (wip !== undefined && wip > 0 && count >= wip) {
            toast({ title: 'WIP limit reached', description: `Cannot add task to ${column} (WIP ${wip})`, status: 'warning' });
            return;
        }
        if (column === 'backlog') {
            createBacklogTask({ title: 'New backlog item' });
        } else {
            createTask({ column, title: 'New task' });
        }
    };
    const handleUpdate = (id: string, patch: Partial<TaskModel>) => updateTask(id, patch);
    const handleDelete = (id: string) => deleteTask(id);

    // Reorder within a single column (optimistic + persist)
    const handleReorder = async (column: string, fromIndex: number, toIndex: number) => {
        const colTasks = colsLocal[column] ? [...colsLocal[column]] : [];
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= colTasks.length || toIndex >= colTasks.length) return;

        const [moved] = colTasks.splice(fromIndex, 1);
        colTasks.splice(toIndex, 0, moved);

        setColsLocal((prev) => ({ ...prev, [column]: colTasks }));

        // persist order to server: give spaced order values (1000,2000,...)
        const payload = colTasks.map((t, idx) => ({ id: t.id, order: (idx + 1) * 1000, columnKey: column }));
        try {
            await reorder(payload);
        } catch (err) {
            // on error, reload from server to restore canonical state
            await load();
        }
    };

    return (
        <Box position="relative">
            <Box mb={4} mt={4}>
                <Heading textAlign="center" w="full">
                    {projectName || 'Project'}
                </Heading>
                <IconButton
                    aria-label="settings"
                    icon={<SettingsIcon />}
                    size="sm"
                    position="absolute"
                    top="8px"
                    right="8px"
                    onClick={() => setIsSettingsOpen(true)}
                />
                {/* show user name top-left */}
                <Box position="absolute" top="8px" left="8px">
                    {/* lazy-load auth to avoid heavy re-renders */}
                    <UsernameDisplay />
                </Box>
            </Box>
            {/* Use auto-fit with minmax so columns resize automatically to fit available width */}
            <Grid templateColumns={{ base: '1fr', md: "repeat(auto-fit, minmax(260px, 1fr))" }} gap={4}>
                {(projectColumns && projectColumns.length > 0 ? projectColumns.map((c) => c) : Object.values(ColumnType).map((k) => ({ key: k, title: k }))).map((colMeta) => (
                    <ProjectColumn
                        key={colMeta.key}
                        column={colMeta.key}
                        title={colMeta.title}
                        tasks={colsLocal[colMeta.key] || []}
                        onCreate={handleCreate}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                        onDropFrom={(from, taskId) => {
                            const colMetaFound = projectColumns.find((c: ProjectColumnMeta) => c.key === colMeta.key);
                            const wip = colMetaFound?.wip;
                            const count = colsLocal[colMeta.key]?.length || 0;
                            if (wip !== undefined && wip > 0 && count >= wip) {
                                toast({ title: 'WIP limit reached', description: `Cannot move task to ${colMeta.title} (WIP ${wip})`, status: 'warning' });
                                return;
                            }
                            moveTask(from, colMeta.key, taskId).then(load);
                        }}
                        onReorder={(fromIdx, toIdx) => handleReorder(colMeta.key, fromIdx, toIdx)}
                    />
                ))}
            </Grid>
            <ColumnSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                projectId={projectId || ''}
                projectColumns={projectColumns}
                saveProjectColumns={saveProjectColumns}
                onSaved={() => { setIsSettingsOpen(false); }}
            />
        </Box>
    );
}
