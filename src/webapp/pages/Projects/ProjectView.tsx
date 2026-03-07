import {
  Box,
  Grid,
  Spinner,
  Heading,
  IconButton,
  useToast,
  Text,
  Button,
  HStack,
  Badge,
  VStack,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { ColumnType } from '../../utils/enums';
import ProjectColumn from '../../components/ProjectColumn/ProjectColumn';
import useProjectTasks, {
  ProjectColumn as ProjectColumnMeta,
} from '../../hooks/useProjectTasks';
import useBacklog from '../../hooks/useBacklog';
import { TaskModel } from '../../utils/models';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import ColumnSettingsModal from '../../components/Project/ColumnSettingsModal';
import MembersModal from '../../components/Project/MembersModal';
import ProjectNavigation from '../../components/Project/ProjectNavigation';
import ProjectError from '../../components/Project/ProjectError';
import BacklogTaskItem from '../../components/Backlog/BacklogTaskItem';
import MoveToColumnDialog from '../../components/Backlog/MoveToColumnDialog';
import MetricsView from '../../components/Metrics/MetricsView';
import TaskDetailPanel from '../../components/TaskDetailPanel/TaskDetailPanel';
import {
  SettingsIcon,
  ArrowBackIcon,
  AtSignIcon,
  AddIcon,
  SearchIcon,
} from '@chakra-ui/icons';
import { useAuth } from '../../hooks/useAuth';
import DarkModeIconButton from '../../components/DarkModeIconButton/DarkModeIconButton';
import useSocket from '../../hooks/useSocket';

// Helper to get user ID from PopulatedUser or string
function getUserId(
  userObj: string | { _id: string } | null | undefined,
): string | null {
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
    <Button
      size="sm"
      leftIcon={<ArrowBackIcon />}
      onClick={() => navigate('/projects')}
    >
      Back
    </Button>
  );
}

export default function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const toast = useToast();

  // View state: 'board', 'backlog', or 'metrics'
  const [activeView, setActiveView] = useState<'board' | 'backlog' | 'metrics'>(
    'board',
  );

  // Board data
  const {
    loading: boardLoading,
    error: boardError,
    columns,
    load,
    createTask,
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

  // Backlog data
  const {
    tasks: backlogTasks,
    loading: backlogLoading,
    error: backlogError,
    load: loadBacklog,
    createTask: createBacklogTask,
    updateTask: updateBacklogTask,
    deleteTask: deleteBacklogTask,
    moveToColumn,
  } = useBacklog(projectId || '');

  // Local state
  const [colsLocal, setColsLocal] = useState(columns);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);

  // Task detail panel state
  const [detailTask, setDetailTask] = useState<TaskModel | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const detailTaskRef = useRef(detailTask);
  detailTaskRef.current = detailTask;

  // Board filter state
  const [boardSearch, setBoardSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const boardSearchRef = useRef<HTMLInputElement>(null);
  const boardFilterActive = !!(boardSearch || filterPriority || filterAssignee);

  // Backlog-specific state
  const [searchQuery, setSearchQuery] = useState('');
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Check if current user is the project owner
  const isOwner = Boolean(
    user && projectOwnerId && getUserId(projectOwnerId) === user.id,
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (e.key === 'Escape') {
        if (isDetailOpen) {
          setIsDetailOpen(false);
          setDetailTask(null);
        } else if (boardFilterActive) {
          setBoardSearch('');
          setFilterPriority(null);
          setFilterAssignee(null);
        }
        (document.activeElement as HTMLElement)?.blur();
        return;
      }

      // Don't trigger shortcuts when typing in inputs
      if (isInput) return;

      if (e.key === '/' && activeView === 'board') {
        e.preventDefault();
        boardSearchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeView, isDetailOpen, boardFilterActive]);

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
      if (data?.memberId === user?.id) {
        toast({
          title: 'Removed from Project',
          description: 'You have been removed from this project',
          status: 'warning',
          duration: 5000,
          isClosable: true,
          position: 'bottom-left',
        });
        setTimeout(() => load(), 2000);
      }
    },
  });

  useEffect(() => {
    setColsLocal(columns);
    // Keep detail panel task in sync with latest data
    const current = detailTaskRef.current;
    if (current) {
      for (const col of Object.values(columns)) {
        const updated = col.find((t) => t.id === current.id);
        if (updated) {
          setDetailTask(updated);
          return;
        }
      }
      // Task was deleted
      setDetailTask(null);
      setIsDetailOpen(false);
    }
  }, [columns]);

  // Filter board tasks based on search + priority + assignee
  const filteredColsLocal = useMemo(() => {
    if (!boardFilterActive) return colsLocal;
    const query = boardSearch.toLowerCase();
    const filtered: Record<string, TaskModel[]> = {};
    for (const [key, tasks] of Object.entries(colsLocal)) {
      filtered[key] = tasks.filter((t) => {
        if (query && !t.title.toLowerCase().includes(query)) return false;
        if (filterPriority && t.priority !== filterPriority) return false;
        if (filterAssignee && t.assigneeId !== filterAssignee) return false;
        return true;
      });
    }
    return filtered;
  }, [
    colsLocal,
    boardSearch,
    filterPriority,
    filterAssignee,
    boardFilterActive,
  ]);

  // Build unique assignees from board tasks for filter pills
  const boardAssignees = useMemo(() => {
    const seen = new Map<string, string>();
    for (const tasks of Object.values(colsLocal)) {
      for (const t of tasks) {
        if (t.assigneeId && !seen.has(t.assigneeId)) {
          const display = t.assignee
            ? t.assignee.name || t.assignee.email || t.assigneeId.slice(-6)
            : t.assigneeId.slice(-6);
          seen.set(t.assigneeId, display);
        }
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [colsLocal]);

  // Filter backlog tasks based on search query
  const filteredBacklogTasks = useMemo(() => {
    if (!searchQuery.trim()) return backlogTasks;
    const query = searchQuery.toLowerCase();
    return backlogTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query)),
    );
  }, [backlogTasks, searchQuery]);

  const handleTaskClick = useCallback((task: TaskModel) => {
    setDetailTask(task);
    setIsDetailOpen(true);
  }, []);

  const loading = boardLoading || (activeView === 'backlog' && backlogLoading);
  const error = boardError || backlogError;

  if (loading && activeView === 'board' && Object.keys(columns).length === 0) {
    return <Spinner />;
  }

  if (error && typeof error === 'object' && 'status' in error) {
    return <ProjectError status={error.status} message={error.message} />;
  }

  // Board handlers
  const handleCreate = (column: string, title?: string) => {
    const colMeta = projectColumns.find(
      (c: ProjectColumnMeta) => c.key === column,
    );
    const wip = colMeta?.wip;
    const count = colsLocal[column]?.length || 0;
    if (wip !== undefined && wip > 0 && count >= wip) {
      toast({
        title: 'WIP limit reached',
        description: `Cannot add task to ${column} (WIP ${wip})`,
        status: 'warning',
      });
      return;
    } else {
      createTask({ column, title: title || 'New task' }).catch((err: any) => {
        const errorMessage =
          err?.response?.data?.error || 'Failed to create task';
        toast({
          title: 'Error',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      });
    }
  };

  const handleUpdate = (id: string, patch: Partial<TaskModel>) => {
    updateTask(id, patch).catch((err: any) => {
      const errorMessage =
        err?.response?.data?.error || 'Failed to update task';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    });
  };

  const handleDelete = (id: string) => {
    deleteTask(id).catch((err: any) => {
      const errorMessage =
        err?.response?.data?.error || 'Failed to delete task';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    });
  };

  const handleMoveToBacklog = (taskId: string) => {
    moveTask('board', 'backlog', taskId).catch((err: any) => {
      const errorMessage =
        err?.response?.data?.error || 'Failed to move task to backlog';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    });
  };

  const handleReorder = async (
    column: string,
    fromIndex: number,
    toIndex: number,
  ) => {
    const colTasks = colsLocal[column] ? [...colsLocal[column]] : [];
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= colTasks.length ||
      toIndex >= colTasks.length
    )
      return;

    const [moved] = colTasks.splice(fromIndex, 1);
    colTasks.splice(toIndex, 0, moved);

    setColsLocal((prev) => ({ ...prev, [column]: colTasks }));

    const payload = colTasks.map((t, idx) => ({
      id: t.id,
      order: (idx + 1) * 1000,
      columnKey: column,
    }));
    try {
      await reorder(payload);
    } catch (err) {
      await load();
    }
  };

  // Backlog handlers
  const handleCreateBacklogTask = async () => {
    try {
      await createBacklogTask({ title: 'New backlog item' });
      toast({
        title: 'Task created',
        status: 'success',
        duration: 2000,
      });
    } catch (err: any) {
      toast({
        title: 'Error creating task',
        description: err?.response?.data?.error || 'Failed to create task',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleUpdateBacklogTask = async (taskId: string, patch: any) => {
    try {
      await updateBacklogTask(taskId, patch);
    } catch (err: any) {
      toast({
        title: 'Error updating task',
        description: err?.response?.data?.error || 'Failed to update task',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleDeleteBacklogTask = async (taskId: string) => {
    try {
      await deleteBacklogTask(taskId);
      toast({
        title: 'Task deleted',
        status: 'success',
        duration: 2000,
      });
    } catch (err: any) {
      toast({
        title: 'Error deleting task',
        description: err?.response?.data?.error || 'Failed to delete task',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleMoveToColumnClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsMoveDialogOpen(true);
  };

  const handleConfirmMoveToColumn = async (columnKey: string) => {
    if (!selectedTaskId) return;
    try {
      await moveToColumn(selectedTaskId, columnKey);
      toast({
        title: 'Task moved to board',
        description: 'The task has been moved to the selected column',
        status: 'success',
        duration: 2000,
      });
      setIsMoveDialogOpen(false);
      setSelectedTaskId(null);
    } catch (err: any) {
      if (err?.response?.data?.error === 'WIP_EXCEEDED') {
        toast({
          title: 'WIP limit exceeded',
          description: 'The target column has reached its WIP limit',
          status: 'warning',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Error moving task',
          description: err?.response?.data?.error || 'Failed to move task',
          status: 'error',
          duration: 5000,
        });
      }
    }
  };

  return (
    <Box position="relative" minH="100vh">
      {/* Header */}
      <Box mb={4} mt={4}>
        <Heading textAlign="center" w="full">
          {projectName || 'No project found'}
        </Heading>

        {/* Back button top-left */}
        <Box position="absolute" top="8px" left="8px">
          <HStack spacing={2}>
            <BackButton />
          </HStack>
        </Box>

        {/* User name + settings top-right */}
        <Box position="absolute" top="8px" right="8px">
          <HStack spacing={2}>
            <UsernameDisplay />
            <Button
              size="sm"
              leftIcon={<AtSignIcon />}
              onClick={() => setIsMembersOpen(true)}
              variant="ghost"
            >
              <Badge ml={1}>{(projectMembers?.length || 0) + 1}</Badge>
            </Button>
            <DarkModeIconButton size="sm" />
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

      {/* View Switcher: Board | Backlog */}
      <ProjectNavigation
        activeView={activeView}
        onViewChange={setActiveView}
        backlogCount={backlogTasks.length}
      />

      {/* Board Filter Bar */}
      {activeView === 'board' && (
        <HStack mb={3} spacing={3} wrap="wrap">
          <InputGroup maxW="260px" size="sm">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              ref={boardSearchRef}
              placeholder="Filter tasks... ( / )"
              value={boardSearch}
              onChange={(e) => setBoardSearch(e.target.value)}
            />
          </InputGroup>
          {(['high', 'medium', 'low'] as const).map((p) => (
            <Badge
              key={p}
              variant={filterPriority === p ? p : undefined}
              cursor="pointer"
              opacity={filterPriority && filterPriority !== p ? 0.4 : 1}
              onClick={() =>
                setFilterPriority((prev) => (prev === p ? null : p))
              }
              px={3}
              py={1}
              fontSize="xs"
            >
              {p}
            </Badge>
          ))}
          {boardAssignees.map((a) => (
            <Badge
              key={a.id}
              variant={filterAssignee === a.id ? 'blue' : undefined}
              cursor="pointer"
              opacity={filterAssignee && filterAssignee !== a.id ? 0.4 : 1}
              onClick={() =>
                setFilterAssignee((prev) => (prev === a.id ? null : a.id))
              }
              px={3}
              py={1}
              fontSize="xs"
            >
              {a.name}
            </Badge>
          ))}
          {boardFilterActive && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setBoardSearch('');
                setFilterPriority(null);
                setFilterAssignee(null);
              }}
            >
              Clear
            </Button>
          )}
        </HStack>
      )}

      {/* Board View */}
      {activeView === 'board' && (
        <Grid
          templateColumns={{
            base: '1fr',
            md: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
          gap={4}
        >
          {(projectColumns && projectColumns.length > 0
            ? projectColumns.map((c) => c)
            : Object.values(ColumnType).map((k) => ({
                key: k,
                title: k,
                wip: undefined,
              }))
          ).map((colMeta) => (
            <ProjectColumn
              key={colMeta.key}
              column={colMeta.key}
              title={colMeta.title}
              wipLimit={colMeta.wip}
              tasks={filteredColsLocal[colMeta.key] || []}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onMoveToBacklog={isOwner ? handleMoveToBacklog : undefined}
              onDropFrom={(from, taskId) => {
                const colMetaFound = projectColumns.find(
                  (c: ProjectColumnMeta) => c.key === colMeta.key,
                );
                const wip = colMetaFound?.wip;
                const count = colsLocal[colMeta.key]?.length || 0;
                if (wip !== undefined && wip > 0 && count >= wip) {
                  toast({
                    title: 'WIP limit reached',
                    description: `Cannot move task to ${colMeta.title} (WIP ${wip})`,
                    status: 'warning',
                  });
                  return;
                }
                moveTask(from, colMeta.key, taskId).then(load);
              }}
              onReorder={(fromIdx, toIdx) =>
                handleReorder(colMeta.key, fromIdx, toIdx)
              }
              onTaskClick={handleTaskClick}
              projectMembers={projectMembers}
              projectOwnerId={projectOwnerId}
            />
          ))}
        </Grid>
      )}

      {/* Backlog View */}
      {activeView === 'backlog' && (
        <Box>
          {/* Backlog Toolbar */}
          <HStack mb={6} spacing={4} justify="space-between" wrap="wrap">
            <HStack spacing={4} flex={1} minW={{ base: 'full', md: 'auto' }}>
              <InputGroup maxW="400px">
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search backlog..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>
              {searchQuery && (
                <Badge colorScheme="blue">
                  {filteredBacklogTasks.length} items
                </Badge>
              )}
            </HStack>

            {isOwner && (
              <Button
                leftIcon={<AddIcon />}
                colorScheme="blue"
                onClick={handleCreateBacklogTask}
              >
                New Backlog Item
              </Button>
            )}
          </HStack>

          {/* Backlog List */}
          <VStack spacing={3} align="stretch">
            {filteredBacklogTasks.length === 0 ? (
              <Box
                textAlign="center"
                py={12}
                borderWidth={2}
                borderStyle="dashed"
                borderColor="gray.200"
                borderRadius="lg"
              >
                <Text color="gray.500" fontSize="lg">
                  {searchQuery
                    ? 'No items match your search'
                    : 'Backlog is empty'}
                </Text>
                {!searchQuery && isOwner && (
                  <Button
                    mt={4}
                    leftIcon={<AddIcon />}
                    variant="outline"
                    onClick={handleCreateBacklogTask}
                  >
                    Add your first backlog item
                  </Button>
                )}
              </Box>
            ) : (
              filteredBacklogTasks.map((task) => (
                <BacklogTaskItem
                  key={task.id}
                  task={task}
                  isOwner={isOwner}
                  onUpdate={(patch) => handleUpdateBacklogTask(task.id, patch)}
                  onDelete={() => handleDeleteBacklogTask(task.id)}
                  onMoveToColumn={() => handleMoveToColumnClick(task.id)}
                />
              ))
            )}
          </VStack>
        </Box>
      )}

      {/* Metrics View */}
      {activeView === 'metrics' && <MetricsView projectId={projectId || ''} />}

      {/* Settings Modal */}
      {isOwner && (
        <ColumnSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          projectId={projectId || ''}
          projectColumns={projectColumns}
          saveProjectColumns={saveProjectColumns}
          onSaved={() => {
            setIsSettingsOpen(false);
          }}
        />
      )}

      {/* Members Modal */}
      <MembersModal
        isOpen={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
        ownerId={projectOwnerId}
        members={projectMembers}
        joinCode={joinCode}
        projectId={projectId || ''}
        onMemberRemoved={load}
      />

      {/* Move to Column Dialog */}
      <MoveToColumnDialog
        isOpen={isMoveDialogOpen}
        onClose={() => {
          setIsMoveDialogOpen(false);
          setSelectedTaskId(null);
        }}
        columns={projectColumns}
        onMove={handleConfirmMoveToColumn}
      />

      {/* Task Detail Side Panel */}
      <TaskDetailPanel
        task={detailTask}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailTask(null);
        }}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onMoveToBacklog={isOwner ? handleMoveToBacklog : undefined}
        projectMembers={projectMembers}
        projectOwnerId={projectOwnerId}
      />
    </Box>
  );
}
