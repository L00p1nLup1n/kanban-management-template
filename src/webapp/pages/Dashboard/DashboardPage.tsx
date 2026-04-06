import {
  Container,
  Heading,
  HStack,
  Select,
  Text,
  Spinner,
  Stack,
  SimpleGrid,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useDashboard } from '../../hooks/useDashboard';
import AggregatedSummary from '../../components/Dashboard/AggregatedSummary';
import ProjectHealthCard from '../../components/Dashboard/ProjectHealthCard';
import UpcomingDeadlines from '../../components/Dashboard/UpcomingDeadlines';
import TeamCapacity from '../../components/Dashboard/TeamCapacity';

const DAYS_OPTIONS = [7, 14, 30, 60, 90];

function DashboardPage() {
  const [days, setDays] = useState(30);
  const { dashboard, loading, error } = useDashboard(days);

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
        <Text color="red.500">Failed to load dashboard: {error}</Text>
      </Container>
    );
  }

  if (!dashboard) return null;

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={6}>
        <HStack justify="space-between" align="center">
          <Heading>Dashboard</Heading>
          <HStack spacing={2}>
            <Text fontSize="sm" whiteSpace="nowrap">
              Period:
            </Text>
            <Select
              size="sm"
              width="100px"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {DAYS_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </Select>
          </HStack>
        </HStack>

        <AggregatedSummary data={dashboard.aggregated} />

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {dashboard.projects.map((project) => (
            <ProjectHealthCard key={project.projectId} project={project} />
          ))}
        </SimpleGrid>

        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={4}>
          <GridItem>
            <UpcomingDeadlines deadlines={dashboard.upcomingDeadlines} />
          </GridItem>
          <GridItem>
            <TeamCapacity members={dashboard.teamCapacity} />
          </GridItem>
        </Grid>
      </Stack>
    </Container>
  );
}

export default DashboardPage;
