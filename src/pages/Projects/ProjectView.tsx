import { Box, Grid, Spinner, Heading, IconButton, useToast, Text, Button, HStack, Badge } from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { ColumnType } from '../../utils/enums';
import ProjectColumn from '../../components/ProjectColumn/ProjectColumn';
import useProjectTasks, { ProjectColumn as ProjectColumnMeta } from '../../hooks/useProjectTasks';
import { TaskModel } from '../../utils/models';
import { useEffect, useState } from 'react';
import ColumnSettingsModal from '../../components/Project/ColumnSettingsModal';
import MembersModal from '../../components/Project/MembersModal';
import ProjectError from '../../components/Project/ProjectError';
import { SettingsIcon, ArrowBackIcon, AtSignIcon } from '@chakra-ui/icons';
import { useAuth } from '../../hooks/useAuth';
import DarkModeIconButton from '../../components/DarkModeIconButton/DarkModeIconButton';
import useSocket from '../../hooks/useSocket';

// Helper to get user ID from PopulatedUser or string
function getUserId(userObj: string | { _id: string } | null | undefined): string | null {
    if (!userObj) return null;
    if (typeof userObj === 'string') return userObj;
    return userObj._id;
}

function UsernameDisplay() {
    const { user } = useAuth();
    return <Text fontSize="sm">{user?.name || user?.email || 'Guest'}</Text>;
}

function BackButton() {
    const navigate = useNavigate();
    return (
        <Button size="sm" leftIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')}>
            Back
        </Button>
    );
}

export default function ProjectView() {
    const { projectId } = useParams<{ projectId: string }>();
    const { user } = useAuth();
    const {
        loading,
        error,
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
        projectOwnerId,
        projectMembers,
        joinCode,
        saveProjectColumns,
    } = useProjectTasks(projectId || '');
    // local optimistic copy used for snappy hover reordering
    const toast = useToast();
    const [colsLocal, setColsLocal] = useState(columns);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMembersOpen, setIsMembersOpen] = useState(false);
    
    // Check if current user is the project owner
    const isOwner = user && projectOwnerId && getUserId(projectOwnerId) === user.id;
    
    // Listen for member join/remove events and show notifications
    useSocket(projectId, {
        'project:member-joined': (data: any) => {
            const memberName = data?.member?.name || data?.member?.email || 'A user';
            toast({
                title: 'New Member Joined',
                description: `${memberName} has joined the project`,
                status: 'info',
                duration: 4000,
                isClosable: true,
                position: 'bottom-left',
            });
        },
        'project:member-removed': (data: any) => {
            // If the current user was removed, they'll see the error screen on next load
            if (data?.memberId === user?.id) {
                toast({
                    title: 'Removed from Project',
                    description: 'You have been removed from this project',
                    status: 'warning',
                    duration: 5000,
                    isClosable: true,
                    position: 'bottom-left',
                });
                // Reload to trigger error screen
                setTimeout(() => load(), 2000);
            }
        },
    });
    
    useEffect(() => {
        setColsLocal(columns);
    }, [columns]);

    if (loading) return <Spinner />;
    
    // Show error screen if project failed to load
    if (error) {
        return <ProjectError status={error.status} message={error.message} />;
    }

    const handleCreate = (column: string) => {
        // enforce WIP
        const colMeta = projectColumns.find((c: ProjectColumnMeta) => c.key === column);
        const wip = colMeta?.wip;
        const count = colsLocal[column]?.length || 0;
        if (wip !== undefined && wip > 0 && count >= wip) {
            toast({ title: 'WIP limit reached', description: `Cannot add task to ${column} (WIP ${wip})`, status: 'warning' });
            return;
        }
        else {
            createTask({ column, title: 'New task' }).catch((err: any) => {
                const errorMessage = err?.response?.data?.error || 'Failed to create task';
                toast({ title: 'Error', description: errorMessage, status: 'error', duration: 5000, isClosable: true });
            });
        }
    };
    const handleUpdate = (id: string, patch: Partial<TaskModel>) => {
        updateTask(id, patch).catch((err: any) => {
            const errorMessage = err?.response?.data?.error || 'Failed to update task';
            toast({ title: 'Error', description: errorMessage, status: 'error', duration: 5000, isClosable: true });
        });
    };
    const handleDelete = (id: string) => {
        deleteTask(id).catch((err: any) => {
            const errorMessage = err?.response?.data?.error || 'Failed to delete task';
            toast({ title: 'Error', description: errorMessage, status: 'error', duration: 5000, isClosable: true });
        });
    };

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
                    {projectName || 'No project found'}
                </Heading>
                {/* show back button top-left */}
                <Box position="absolute" top="8px" left="8px">
                    <HStack spacing={2}>
                        {/* Back to projects */}
                        <BackButton />
                    </HStack>
                </Box>

                {/* show user name + settings top-right */}
                <Box position="absolute" top="8px" right="8px">
                    <HStack spacing={2}>
                        {/* lazy-load auth to avoid heavy re-renders */}
                        <UsernameDisplay />
                        {/* Members count and button */}
                        <Button
                            size="sm"
                            leftIcon={<AtSignIcon />}
                            onClick={() => setIsMembersOpen(true)}
                            variant="ghost"
                        >
                            <Badge ml={1}>{(projectMembers?.length || 0) + 1}</Badge>
                        </Button>
                        <DarkModeIconButton size="sm"/>
                        {/* Only show settings button to project owner */}
                        {isOwner && (
                            <IconButton
                                aria-label="settings"
                                icon={<SettingsIcon />}
                                size="sm"
                                onClick={() => setIsSettingsOpen(true)}
                            />
                        )}
                    </HStack>
                </Box>
            </Box>
            {/* Use auto-fit with minmax so columns resize automatically to fit available width */}
            <Grid templateColumns={{ base: '1fr', md: "repeat(auto-fit, minmax(260px, 1fr))" }} gap={4}>
            {(projectColumns && projectColumns.length > 0 ? projectColumns.map((c) => c) : Object.values(ColumnType).map((k) => ({ key: k, title: k, wip: undefined }))).map((colMeta) => (
                <ProjectColumn
                    key={colMeta.key}
                    column={colMeta.key}
                    title={colMeta.title}
                    wipLimit={colMeta.wip}
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
                    projectMembers={projectMembers}
                    projectOwnerId={projectOwnerId}
                />
            ))}
            </Grid>
            {/* Only render settings modal if user is owner */}
            {isOwner && (
                <ColumnSettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    projectId={projectId || ''}
                    projectColumns={projectColumns}
                    saveProjectColumns={saveProjectColumns}
                    onSaved={() => { setIsSettingsOpen(false); }}
                />
            )}
            <MembersModal
                isOpen={isMembersOpen}
                onClose={() => setIsMembersOpen(false)}
                ownerId={projectOwnerId}
                members={projectMembers}
                joinCode={joinCode}
                projectId={projectId || ''}
                onMemberRemoved={load}
            />
        </Box>
    );
}
