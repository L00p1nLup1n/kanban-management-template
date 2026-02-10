import { ColumnType } from '../../utils/enums';
import {
  Badge,
  Box,
  Flex,
  Heading,
  IconButton,
  Spacer,
  Stack,
  useColorModeValue,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import Task from '../Task/Task';
import useColumnTasks from '../../hooks/useColumnTasks';
import useColumnDrop from '../../hooks/useColumnDrop';

export const ColumnColorScheme: Record<ColumnType, string> = {
  'To do': 'blue',
  'In Progress': 'yellow',
  Done: 'green',
};

function Column({ column }: { column: ColumnType }) {
  const {
    tasks,
    addEmptyTask,
    deleteTask,
    dropTaskFrom,
    swapTasks,
    updateTask,
  } = useColumnTasks(column);

  const { dropRef, isOver } = useColumnDrop(column, dropTaskFrom);

  const ColumnTasks = tasks.map((task, index) => (
    <Task
      key={task.id}
      task={task}
      index={index}
      onDropHover={swapTasks}
      onUpdate={updateTask}
      onDelete={deleteTask}
    />
  ));

  const iconColor100 = `${ColumnColorScheme[column]}.100`;
  const iconColor200 = `${ColumnColorScheme[column]}.200`;
  const iconColor400 = `${ColumnColorScheme[column]}.400`;

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
            colorScheme={ColumnColorScheme[column]}
            fontSize={{ base: 'sm', md: 'lg' }}
            textTransform="none"
            overflow="hidden"
            whiteSpace="nowrap"
            textOverflow="ellipsis"
          >
            {column}
          </Badge>
        </Heading>
        <IconButton
          size="sm"
          minW="44px"
          color={useColorModeValue('gray.800', 'gray.600')}
          bgColor={useColorModeValue(iconColor200, iconColor400)}
          _hover={{ bgColor: useColorModeValue(iconColor100, iconColor200) }}
          rounded="xl"
          variant="solid"
          fontSize="lg"
          onClick={addEmptyTask}
          colorScheme={ColumnColorScheme[column]}
          aria-label="add-task"
          icon={<AddIcon />}
        />
      </Flex>
      <Stack
        ref={dropRef}
        direction={{ base: 'row', md: 'column' }}
        h={{ base: 200, md: 500 }}
        p={3}
        mt={2}
        spacing={4}
        bgColor={useColorModeValue('brand.surfaceLight', 'brand.column')}
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

export default Column;
