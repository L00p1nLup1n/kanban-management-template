import {
  Box,
  Heading,
  Text,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { projectsAPI, ProjectBudget } from '../../api/client';

interface BudgetSummaryProps {
  projectId: string;
}

export default function BudgetSummary({ projectId }: BudgetSummaryProps) {
  const [data, setData] = useState<ProjectBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    projectsAPI
      .getBudget(projectId)
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load budget data'))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <Spinner mt={8} />;
  if (error)
    return (
      <Alert status="error" mt={4}>
        <AlertIcon />
        {error}
      </Alert>
    );
  if (!data) return null;

  const { budget, totalCost, remaining, tasks } = data;
  const hasBudget = budget != null;
  const pct =
    hasBudget && budget > 0 ? Math.min((totalCost / budget) * 100, 100) : 0;
  const overBudget = hasBudget && totalCost > budget;

  return (
    <Box maxW="800px" mx="auto" mt={4}>
      <Heading size="md" mb={4}>
        Budget Overview
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Stat>
          <StatLabel>Budget</StatLabel>
          <StatNumber>
            {hasBudget ? `$${budget.toLocaleString()}` : '—'}
          </StatNumber>
          <StatHelpText>
            {hasBudget ? 'Project budget' : 'Not set'}
          </StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Total Cost</StatLabel>
          <StatNumber color={overBudget ? 'red.500' : undefined}>
            ${totalCost.toLocaleString()}
          </StatNumber>
          <StatHelpText>
            Across {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </StatHelpText>
        </Stat>
        <Stat>
          <StatLabel>Remaining</StatLabel>
          <StatNumber
            color={remaining != null && remaining < 0 ? 'red.500' : 'green.500'}
          >
            {remaining != null ? `$${remaining.toLocaleString()}` : '—'}
          </StatNumber>
          <StatHelpText>
            {overBudget
              ? 'Over budget'
              : hasBudget
              ? 'Available'
              : 'No budget set'}
          </StatHelpText>
        </Stat>
      </SimpleGrid>

      {hasBudget && (
        <Box mb={6}>
          <Text fontSize="sm" mb={1}>
            {pct.toFixed(1)}% used
          </Text>
          <Progress
            value={pct}
            colorScheme={overBudget ? 'red' : pct > 80 ? 'orange' : 'blue'}
            borderRadius="md"
            size="md"
          />
        </Box>
      )}

      {tasks.length === 0 ? (
        <Text color="gray.500">No tasks with a cost assigned yet.</Text>
      ) : (
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>Task</Th>
              <Th>Location</Th>
              <Th isNumeric>Cost</Th>
            </Tr>
          </Thead>
          <Tbody>
            {tasks.map((t) => (
              <Tr key={t._id}>
                <Td>{t.title}</Td>
                <Td>
                  {t.backlog ? (
                    <Badge colorScheme="gray">Backlog</Badge>
                  ) : (
                    <Badge colorScheme="blue">{t.columnKey ?? 'Board'}</Badge>
                  )}
                </Td>
                <Td isNumeric>${t.cost.toLocaleString()}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  );
}
