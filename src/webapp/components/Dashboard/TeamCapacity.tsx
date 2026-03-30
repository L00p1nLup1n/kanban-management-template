import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { TeamMemberCapacity } from '../../api/client';
import { getRoleLabel, getRoleColor } from '../../utils/roles';

interface TeamCapacityProps {
  members: TeamMemberCapacity[];
}

function TeamCapacity({ members }: TeamCapacityProps) {
  const bg = useColorModeValue('white', 'gray.700');

  if (members.length === 0) {
    return (
      <Box p={5} bg={bg} borderRadius="md" boxShadow="sm">
        <Heading size="sm" mb={3}>
          Team Capacity
        </Heading>
        <Text fontSize="sm" color="gray.500">
          No active task assignments.
        </Text>
      </Box>
    );
  }

  return (
    <Box p={5} bg={bg} borderRadius="md" boxShadow="sm" overflowX="auto">
      <Heading size="sm" mb={3}>
        Team Capacity
      </Heading>
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Member</Th>
            <Th>Role</Th>
            <Th>Projects</Th>
            <Th isNumeric>Active Tasks</Th>
          </Tr>
        </Thead>
        <Tbody>
          {members.map((m) => (
            <Tr key={m.userId}>
              <Td>
                <Text fontSize="sm" fontWeight="medium">
                  {m.name}
                </Text>
              </Td>
              <Td>
                <Badge colorScheme={getRoleColor(m.role)} fontSize="xs">
                  {getRoleLabel(m.role)}
                </Badge>
              </Td>
              <Td>
                <Text fontSize="xs" color="gray.500">
                  {m.assignments
                    .map((a) => `${a.projectName} (${a.taskCount})`)
                    .join(', ')}
                </Text>
              </Td>
              <Td isNumeric>
                <Badge
                  colorScheme={
                    m.totalTasks > 5
                      ? 'red'
                      : m.totalTasks > 3
                      ? 'yellow'
                      : 'green'
                  }
                >
                  {m.totalTasks}
                </Badge>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

export default TeamCapacity;
