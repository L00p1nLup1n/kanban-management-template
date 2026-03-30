import {
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Box,
  useColorModeValue,
} from '@chakra-ui/react';
import { DashboardAggregated } from '../../api/client';

interface AggregatedSummaryProps {
  data: DashboardAggregated;
}

function StatCard({ label, value }: { label: string; value: number }) {
  const bg = useColorModeValue('white', 'gray.700');
  return (
    <Box p={4} bg={bg} borderRadius="md" boxShadow="sm">
      <Stat>
        <StatLabel>{label}</StatLabel>
        <StatNumber>{value}</StatNumber>
      </Stat>
    </Box>
  );
}

function AggregatedSummary({ data }: AggregatedSummaryProps) {
  return (
    <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
      <StatCard label="Projects" value={data.projectCount} />
      <StatCard label="Total Tasks" value={data.totalTasks} />
      <StatCard label="In Progress" value={data.totalInProgress} />
      <StatCard label="Completed" value={data.totalCompleted} />
      <StatCard label="Backlog" value={data.totalBacklog} />
    </SimpleGrid>
  );
}

export default AggregatedSummary;
