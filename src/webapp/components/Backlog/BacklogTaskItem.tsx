import {
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  IconButton,
  useColorModeValue,
  Avatar,
  Tooltip,
} from '@chakra-ui/react';
import { ArrowRightIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';
import { BacklogTaskModel } from '../../hooks/useBacklog';

interface BacklogTaskItemProps {
  task: BacklogTaskModel;
  isOwner: boolean;
  onEdit?: () => void;
  onDelete: () => void;
  onMoveToColumn: () => void;
}

const priorityColors: Record<string, string> = {
  high: 'red',
  medium: 'yellow',
  low: 'green',
};

export default function BacklogTaskItem({
  task,
  isOwner,
  onEdit,
  onDelete,
  onMoveToColumn,
}: BacklogTaskItemProps) {
  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Box
      p={4}
      bg={bgColor}
      borderWidth={1}
      borderColor={borderColor}
      borderRadius="md"
      boxShadow="sm"
      _hover={{ boxShadow: 'md', borderColor: 'blue.300' }}
      transition="all 0.2s"
    >
      <HStack justify="space-between" align="start" spacing={4}>
        <VStack align="start" spacing={2} flex={1}>
          {/* Title */}
          <Text fontWeight="semibold" fontSize="md">
            {task.title}
          </Text>

          {/* Meta row */}
          <HStack spacing={3} wrap="wrap">
            {task.priority && (
              <Badge colorScheme={priorityColors[task.priority]}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </Badge>
            )}
            {task.dueDate && (
              <Badge colorScheme="purple">Due {formatDate(task.dueDate)}</Badge>
            )}
            <Text fontSize="xs" color="gray.500">
              Created {formatDate(task.createdAt)}
            </Text>
          </HStack>

          {/* Description preview */}
          {task.description && (
            <Text fontSize="sm" color="gray.600" noOfLines={2}>
              {task.description}
            </Text>
          )}
        </VStack>

        {/* Actions */}
        <HStack spacing={1}>
          {task.assignee && (
            <Tooltip
              label={`Assigned to: ${
                task.assignee.name || task.assignee.email
              }`}
            >
              <Avatar
                size="sm"
                name={task.assignee.name || task.assignee.email}
                mr={2}
              />
            </Tooltip>
          )}

          {isOwner && onEdit && (
            <Tooltip label="Edit task">
              <IconButton
                aria-label="Edit task"
                icon={<EditIcon />}
                size="sm"
                colorScheme="gray"
                variant="ghost"
                onClick={onEdit}
              />
            </Tooltip>
          )}

          <Tooltip label="Move to board">
            <IconButton
              aria-label="Move to board"
              icon={<ArrowRightIcon />}
              size="sm"
              colorScheme="blue"
              variant="ghost"
              onClick={onMoveToColumn}
            />
          </Tooltip>

          {isOwner && (
            <Tooltip label="Delete">
              <IconButton
                aria-label="Delete"
                icon={<DeleteIcon />}
                size="sm"
                colorScheme="red"
                variant="ghost"
                onClick={onDelete}
              />
            </Tooltip>
          )}
        </HStack>
      </HStack>
    </Box>
  );
}
