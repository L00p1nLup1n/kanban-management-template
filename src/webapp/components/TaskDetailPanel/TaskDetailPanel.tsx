import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  FormLabel,
  Select,
  Input,
  HStack,
  VStack,
  Badge,
  Text,
  Avatar,
  useColorModeValue,
  IconButton,
  Editable,
  EditablePreview,
  EditableInput,
} from '@chakra-ui/react';
import { DeleteIcon, ArrowLeftIcon } from '@chakra-ui/icons';
import { TaskModel } from '../../utils/models';
import { PopulatedUser } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

function getUserId(
  userObj: string | PopulatedUser | null | undefined,
): string | null {
  if (!userObj) return null;
  if (typeof userObj === 'string') return userObj;
  return userObj._id;
}

function getUserDisplay(
  userObj: string | PopulatedUser | null | undefined,
): string {
  if (!userObj) return 'Unknown';
  if (typeof userObj === 'string') return `User ${userObj.slice(-6)}`;
  return userObj.name || userObj.email || `User ${userObj._id.slice(-6)}`;
}

interface TaskDetailPanelProps {
  task: TaskModel | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<TaskModel>) => void;
  onDelete: (id: string) => void;
  onMoveToBacklog?: (id: string) => void;
  projectMembers?: (string | PopulatedUser)[];
  projectOwnerId?: string | PopulatedUser | null;
}

export default function TaskDetailPanel({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onMoveToBacklog,
  projectMembers = [],
  projectOwnerId,
}: TaskDetailPanelProps) {
  const { user } = useAuth();
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const isOwner =
    user && projectOwnerId && getUserId(projectOwnerId) === user.id;

  // Build list of all team members (owner + members)
  const allMembers: Array<{ id: string; display: string }> = [];
  if (projectOwnerId) {
    const ownerId = getUserId(projectOwnerId);
    if (ownerId) {
      allMembers.push({ id: ownerId, display: getUserDisplay(projectOwnerId) });
    }
  }
  projectMembers.forEach((member) => {
    const memberId = getUserId(member);
    if (memberId && !allMembers.find((m) => m.id === memberId)) {
      allMembers.push({ id: memberId, display: getUserDisplay(member) });
    }
  });

  if (!task) return null;

  const saveField = (patch: Partial<TaskModel>) => {
    onUpdate(task.id, patch);
  };

  const formatTimestamp = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" borderColor={borderColor} pb={3}>
          <Editable
            defaultValue={task.title || 'Untitled task'}
            key={task.id + task.title}
            isDisabled={!isOwner}
            onSubmit={(val) => saveField({ title: val })}
            fontSize="lg"
            fontWeight="bold"
            pr={8}
          >
            <EditablePreview w="full" />
            <EditableInput />
          </Editable>
          <HStack mt={2} spacing={2}>
            <Badge
              variant={
                task.priority === 'high'
                  ? 'red'
                  : task.priority === 'low'
                  ? 'green'
                  : 'yellow'
              }
            >
              {task.priority ?? 'medium'}
            </Badge>
            {task.dueDate && (
              <Badge variant="blue">
                Due {new Date(task.dueDate).toLocaleDateString()}
              </Badge>
            )}
          </HStack>
        </DrawerHeader>

        <DrawerBody pt={4}>
          <VStack spacing={5} align="stretch">
            {/* Priority */}
            {isOwner && (
              <div>
                <FormLabel fontSize="sm" mb={1}>
                  Priority
                </FormLabel>
                <Select
                  size="sm"
                  value={task.priority ?? 'medium'}
                  onChange={(e) =>
                    saveField({
                      priority: e.target.value as TaskModel['priority'],
                    })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </div>
            )}

            {/* Assignee */}
            {isOwner && (
              <div>
                <FormLabel fontSize="sm" mb={1}>
                  Assignee
                </FormLabel>
                <Select
                  size="sm"
                  value={task.assigneeId || ''}
                  onChange={(e) =>
                    saveField({ assigneeId: e.target.value || undefined })
                  }
                  placeholder="Unassigned"
                >
                  {allMembers
                    .filter((m) => m.id !== getUserId(projectOwnerId))
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.display}
                      </option>
                    ))}
                </Select>
              </div>
            )}

            {/* Assignee display for non-owners */}
            {!isOwner && task.assignee && (
              <div>
                <FormLabel fontSize="sm" mb={1}>
                  Assignee
                </FormLabel>
                <HStack spacing={2}>
                  <Avatar
                    size="xs"
                    name={getUserDisplay(task.assignee)}
                    bg="blue.500"
                    color="white"
                  />
                  <Text fontSize="sm">{getUserDisplay(task.assignee)}</Text>
                </HStack>
              </div>
            )}

            {/* Due date */}
            {isOwner && (
              <div>
                <FormLabel fontSize="sm" mb={1}>
                  Due date
                </FormLabel>
                <Input
                  size="sm"
                  type="date"
                  value={
                    task.dueDate
                      ? new Date(task.dueDate).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) =>
                    saveField({
                      dueDate: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : undefined,
                    })
                  }
                />
              </div>
            )}

            {/* Timestamps */}
            {(task.startedAt || task.completedAt || task.committedAt) && (
              <div>
                <FormLabel fontSize="sm" mb={1}>
                  Timeline
                </FormLabel>
                <VStack spacing={1} align="stretch">
                  {task.committedAt && (
                    <Text fontSize="xs" color="gray.500">
                      Committed: {formatTimestamp(task.committedAt)}
                    </Text>
                  )}
                  {task.startedAt && (
                    <Text fontSize="xs" color="blue.500">
                      Started: {formatTimestamp(task.startedAt)}
                    </Text>
                  )}
                  {task.completedAt && (
                    <Text fontSize="xs" color="green.500">
                      Completed: {formatTimestamp(task.completedAt)}
                    </Text>
                  )}
                </VStack>
              </div>
            )}

            {/* Actions */}
            {isOwner && (
              <HStack
                spacing={2}
                pt={4}
                borderTopWidth="1px"
                borderColor={borderColor}
              >
                {onMoveToBacklog && (
                  <IconButton
                    aria-label="Move to backlog"
                    icon={<ArrowLeftIcon />}
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onMoveToBacklog(task.id);
                      onClose();
                    }}
                    title="Move to backlog"
                  />
                )}
                <IconButton
                  aria-label="Delete task"
                  icon={<DeleteIcon />}
                  size="sm"
                  variant="outline"
                  colorScheme="red"
                  onClick={() => {
                    onDelete(task.id);
                    onClose();
                  }}
                />
              </HStack>
            )}
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
