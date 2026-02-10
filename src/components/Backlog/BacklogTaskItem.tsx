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
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  PopoverFooter,
  Button,
  FormLabel,
  Select,
  NumberInput,
  NumberInputField,
} from '@chakra-ui/react';
import { useState } from 'react';
import {
  ArrowRightIcon,
  DeleteIcon,
  EditIcon,
  CheckIcon,
  CloseIcon,
  SettingsIcon,
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

  // Settings popover state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localStoryPoints, setLocalStoryPoints] = useState<number>(
    task.storyPoints ?? 0,
  );
  const [localPriority, setLocalPriority] = useState<
    BacklogTaskModel['priority']
  >(task.priority ?? 'medium');

  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const popoverBg = useColorModeValue('brand.surfaceLight', 'brand.popoverBg');
  

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

  const handleSettingsSave = () => {
    const updates: Partial<BacklogTaskModel> = {};

    if (localStoryPoints !== (task.storyPoints ?? 0)) {
      updates.storyPoints = localStoryPoints;
    }
    if (localPriority !== (task.priority ?? 'medium')) {
      updates.priority = localPriority;
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
    setIsSettingsOpen(false);
  };

  const handleSettingsCancel = () => {
    setLocalStoryPoints(task.storyPoints ?? 0);
    setLocalPriority(task.priority ?? 'medium');
    setIsSettingsOpen(false);
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

          {isOwner && (
            <Popover
              isOpen={isSettingsOpen}
              onOpen={() => setIsSettingsOpen(true)}
              onClose={() => setIsSettingsOpen(false)}
              placement="left"
            >
              <PopoverTrigger>
                <IconButton
                  aria-label="Settings"
                  icon={<SettingsIcon />}
                  size="sm"
                  colorScheme="gray"
                  variant="ghost"
                />
              </PopoverTrigger>
              <PopoverContent w={64} p={2} bg={popoverBg}>
                <PopoverArrow />
                <PopoverBody>
                  <FormLabel fontSize="sm" mb={1}>
                    Story Points
                  </FormLabel>
                  <NumberInput
                    value={localStoryPoints}
                    min={0}
                    onChange={(_, v) => setLocalStoryPoints(v)}
                    mb={2}
                  >
                    <NumberInputField />
                  </NumberInput>

                  <FormLabel fontSize="sm" mb={1}>
                    Priority
                  </FormLabel>
                  <Select
                    value={localPriority}
                    onChange={(e) =>
                      setLocalPriority(
                        e.target.value as BacklogTaskModel['priority'],
                      )
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Select>
                </PopoverBody>
                <PopoverFooter display="flex" gap={2}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSettingsCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={handleSettingsSave}
                  >
                    Save
                  </Button>
                </PopoverFooter>
              </PopoverContent>
            </Popover>
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
