import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  useColorModeValue,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { DashboardDeadline } from '../../api/client';

interface UpcomingDeadlinesProps {
  deadlines: DashboardDeadline[];
}

function urgencyColor(daysUntilDue: number): string {
  if (daysUntilDue <= 0) return 'red';
  if (daysUntilDue <= 3) return 'yellow';
  return 'green';
}

const priorityColors: Record<string, string> = {
  high: 'red',
  medium: 'orange',
  low: 'gray',
};

function UpcomingDeadlines({ deadlines }: UpcomingDeadlinesProps) {
  const bg = useColorModeValue('white', 'gray.700');

  if (deadlines.length === 0) {
    return (
      <Box p={5} bg={bg} borderRadius="md" boxShadow="sm">
        <Heading size="sm" mb={3}>
          Upcoming Deadlines
        </Heading>
        <Text fontSize="sm" color="gray.500">
          No upcoming deadlines in the next 14 days.
        </Text>
      </Box>
    );
  }

  return (
    <Box p={5} bg={bg} borderRadius="md" boxShadow="sm" overflowX="auto">
      <Heading size="sm" mb={3}>
        Upcoming Deadlines
      </Heading>
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Task</Th>
            <Th>Project</Th>
            <Th>Due</Th>
            <Th>Priority</Th>
            <Th>Assignee</Th>
          </Tr>
        </Thead>
        <Tbody>
          {deadlines.map((d) => (
            <Tr key={d.taskId}>
              <Td>
                <Text fontSize="sm" noOfLines={1} maxW="200px">
                  {d.title}
                </Text>
              </Td>
              <Td>
                <ChakraLink
                  as={RouterLink}
                  to={`/projects/${d.projectId}`}
                  fontSize="sm"
                  color="blue.500"
                >
                  {d.projectName}
                </ChakraLink>
              </Td>
              <Td>
                <Badge colorScheme={urgencyColor(d.daysUntilDue)} fontSize="xs">
                  {d.daysUntilDue <= 0
                    ? 'Overdue'
                    : d.daysUntilDue === 1
                    ? 'Tomorrow'
                    : `${d.daysUntilDue} days`}
                </Badge>
              </Td>
              <Td>
                <Badge
                  colorScheme={priorityColors[d.priority] || 'gray'}
                  fontSize="xs"
                >
                  {d.priority}
                </Badge>
              </Td>
              <Td>
                <Text fontSize="sm">{d.assigneeName || '-'}</Text>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

export default UpcomingDeadlines;
