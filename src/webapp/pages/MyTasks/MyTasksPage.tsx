import {
  Container,
  Heading,
  Text,
  Stack,
  Box,
  Badge,
  HStack,
  Spinner,
  useColorModeValue,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useMyTasks } from '../../hooks/useMyTasks';
import { Task } from '../../api/client';

const PRIORITY_COLOR: Record<string, string> = {
  high: 'red',
  medium: 'orange',
  low: 'green',
};

function TaskRow({
  task,
  columns,
}: {
  task: Task;
  columns: { key: string; title: string }[];
}) {
  const cardBg = useColorModeValue('white', 'gray.700');
  const column = columns.find((c) => c.key === task.columnKey);

  return (
    <Box p={3} bg={cardBg} borderRadius="md" boxShadow="sm">
      <HStack justify="space-between" align="flex-start">
        <Box flex={1}>
          <Text fontWeight="semibold" fontSize="sm">
            {task.title}
          </Text>
          {task.description && (
            <Text fontSize="xs" color="gray.500" noOfLines={1} mt={1}>
              {task.description}
            </Text>
          )}
        </Box>
        <HStack spacing={2} flexShrink={0}>
          {column && (
            <Badge colorScheme="blue" variant="subtle" fontSize="xs">
              {column.title}
            </Badge>
          )}
          {task.priority && (
            <Badge
              colorScheme={PRIORITY_COLOR[task.priority] || 'gray'}
              fontSize="xs"
            >
              {task.priority}
            </Badge>
          )}
          {task.dueDate && (
            <Badge
              colorScheme={isDueSoon(task.dueDate) ? 'red' : 'gray'}
              variant="outline"
              fontSize="xs"
            >
              {new Date(task.dueDate).toLocaleDateString()}
            </Badge>
          )}
        </HStack>
      </HStack>
    </Box>
  );
}

function isDueSoon(dueDate: string): boolean {
  const diff = new Date(dueDate).getTime() - Date.now();
  return diff < 3 * 24 * 60 * 60 * 1000; // within 3 days
}

function MyTasksPage() {
  const { projects, loading, error } = useMyTasks();
  const sectionBg = useColorModeValue('gray.50', 'gray.800');

  if (loading) {
    return (
      <Container maxW="container.xl" py={8} textAlign="center">
        <Spinner size="lg" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text color="red.500">Failed to load tasks: {error}</Text>
      </Container>
    );
  }

  const totalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0);

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={6}>
        <HStack justify="space-between" align="center">
          <Heading>My Tasks</Heading>
          <Badge
            colorScheme="blue"
            fontSize="md"
            px={3}
            py={1}
            borderRadius="full"
          >
            {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
          </Badge>
        </HStack>

        {projects.length === 0 && (
          <Text color="gray.500">No tasks assigned to you yet.</Text>
        )}

        {projects.map((project) => (
          <Box key={project.projectId} p={4} bg={sectionBg} borderRadius="md">
            <HStack mb={3} justify="space-between">
              <Heading size="sm">
                <ChakraLink
                  as={RouterLink}
                  to={`/projects/${project.projectId}`}
                  color="blue.500"
                >
                  {project.projectName}
                </ChakraLink>
              </Heading>
              <Badge colorScheme="gray">{project.tasks.length} tasks</Badge>
            </HStack>
            <Stack spacing={2}>
              {project.tasks.map((task) => (
                <TaskRow key={task._id} task={task} columns={project.columns} />
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Container>
  );
}

export default MyTasksPage;
