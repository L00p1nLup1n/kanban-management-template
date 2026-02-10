import {
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  IconButton,
  Input,
  useColorModeValue,
  Avatar,
  Tooltip,
} from '@chakra-ui/react';
import { useState } from 'react';
import {
  ArrowRightIcon,
  DeleteIcon,
  EditIcon,
  CheckIcon,
  CloseIcon,
} from '@chakra-ui/icons';
import { BacklogTaskModel } from '../../hooks/useBacklog';

interface BacklogTaskItemProps {
  task: BacklogTaskModel;
  isOwner: boolean;
  onUpdate: (patch: Partial<BacklogTaskModel>) => void;
  onDelete: () => void;
  onMoveToColumn: () => void;
}

const priorityColors = {
  high: 'red',
  medium: 'yellow',
  low: 'green',
};

export default function BacklogTaskItem({
  task,
  isOwner,
  onUpdate,
  onDelete,
  onMoveToColumn,
}: BacklogTaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleSave = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdate({ title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setIsEditing(false);
  };

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
          {/* Title row */}
          {isEditing ? (
            <HStack width="full" spacing={2}>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                size="sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
              />
              <IconButton
                aria-label="Save"
                icon={<CheckIcon />}
                size="sm"
                colorScheme="green"
                onClick={handleSave}
              />
              <IconButton
                aria-label="Cancel"
                icon={<CloseIcon />}
                size="sm"
                onClick={handleCancel}
              />
            </HStack>
          ) : (
            <HStack spacing={2} align="center">
              <Text fontWeight="semibold" fontSize="md">
                {task.title}
              </Text>
              {isOwner && (
                <IconButton
                  aria-label="Edit title"
                  icon={<EditIcon />}
                  size="xs"
                  variant="ghost"
                  opacity={0.6}
                  _hover={{ opacity: 1 }}
                  onClick={() => setIsEditing(true)}
                />
              )}
            </HStack>
          )}

          {/* Meta row */}
          <HStack spacing={3} wrap="wrap">
            {task.priority && (
              <Badge colorScheme={priorityColors[task.priority]}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </Badge>
            )}

            {task.storyPoints !== undefined && task.storyPoints > 0 && (
              <Badge variant="outline" colorScheme="blue">
                {task.storyPoints} SP
              </Badge>
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
