// column is a free-form string key to support custom columns
import {
  Badge,
  Box,
  Flex,
  Heading,
  Stack,
  useColorModeValue,
  Progress,
} from '@chakra-ui/react';
import Task from '../Task/Task';
import useColumnDrop from '../../hooks/useColumnDrop';
import { TaskModel } from '../../utils/models';
import { PopulatedUser, ProjectMember } from '../../api/client';

function ProjectColumn({
  column,
  title,
  tasks,
  onUpdate,
  onDelete,
  onMoveToBacklog,
  onDropFrom,
  onReorder,
  projectMembers,
  projectOwnerId,
  wipLimit,
}: {
  // internal column key
  column: string;
  // user-facing title (optional). If omitted, `column` is used.
  title?: string;
  tasks: TaskModel[];
  onUpdate: (id: string, patch: Partial<TaskModel>) => void;
  onDelete: (id: string) => void;
  onMoveToBacklog?: (id: string) => void;
  onDropFrom: (from: string, taskId: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  projectMembers?: ProjectMember[];
  projectOwnerId?: string | PopulatedUser | null;
  wipLimit?: number;
}) {
  const { dropRef, isOver } = useColumnDrop(column, onDropFrom);

  const currentCount = tasks.length;
  const isWipExceed =
    wipLimit !== undefined && wipLimit > 0 && currentCount > wipLimit;
  const isWipNearLimit =
    wipLimit !== undefined && wipLimit > 0 && currentCount === wipLimit;
  const showWipIndicator = wipLimit !== undefined && wipLimit > 0;
  const wipBadgeColor = isWipExceed
    ? 'red'
    : isWipNearLimit
    ? 'yellow'
    : 'gray';

  const ColumnTasks = tasks.map((task, index) => (
    <Task
      key={task.id}
      task={task}
      index={index}
      onDropHover={(fromIndex, toIndex) =>
        onReorder && onReorder(fromIndex, toIndex)
      }
      onUpdate={onUpdate}
      onDelete={onDelete}
      //   onMoveToBacklog={onMoveToBacklog}
      projectMembers={projectMembers}
      projectOwnerId={projectOwnerId}
    />
  ));

  return (
    <Box w="full" minW={0} display="flex" flexDirection="column">
      <Flex align="center" gap={2}>
        <Heading flex="1" minW={0} letterSpacing="wide" textAlign="center">
          <Badge
            display="block"
            flex="1"
            minW={0}
            px={{ base: 3, md: 6 }}
            py={3}
            rounded="xl"
            fontSize={{ base: 'sm', md: 'lg' }}
            textTransform="none"
            overflow="hidden"
            whiteSpace="nowrap"
            textOverflow="ellipsis"
            colorScheme={showWipIndicator ? wipBadgeColor : undefined}
          >
            {title ?? column}{' '}
            {showWipIndicator && `(${currentCount}/${wipLimit})`}
          </Badge>
        </Heading>
      </Flex>
      <Stack
        ref={dropRef}
        direction={{ base: 'row', md: 'column' }}
        minH={{ base: 200, md: '60vh' }}
        p={3}
        mt={2}
        spacing={4}
        bgColor={useColorModeValue('gray.50', 'gray.900')}
        rounded="lg"
        boxShadow="md"
        overflow="auto"
        opacity={isOver ? 0.85 : 1}
        flexGrow={1}
        minW={0}
      >
        {ColumnTasks}
      </Stack>
    </Box>
  );
}

export default ProjectColumn;
