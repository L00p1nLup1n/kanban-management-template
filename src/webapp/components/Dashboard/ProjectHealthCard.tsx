import {
  Box,
  Text,
  Badge,
  HStack,
  VStack,
  Stat,
  StatLabel,
  StatNumber,
  SimpleGrid,
  useColorModeValue,
  Link as ChakraLink,
  List,
  ListItem,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { DashboardProject } from '../../api/client';

interface ProjectHealthCardProps {
  project: DashboardProject;
}

const healthColors: Record<string, string> = {
  on_track: 'green',
  at_risk: 'yellow',
  blocked: 'red',
};

const healthLabels: Record<string, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  blocked: 'Blocked',
};

function ProjectHealthCard({ project }: ProjectHealthCardProps) {
  const bg = useColorModeValue('white', 'gray.700');
  const reasonColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <Box p={5} bg={bg} borderRadius="md" boxShadow="sm">
      <HStack justify="space-between" mb={3}>
        <ChakraLink
          as={RouterLink}
          to={`/projects/${project.projectId}`}
          fontWeight="bold"
          fontSize="lg"
          color="blue.500"
        >
          {project.name}
        </ChakraLink>
        <HStack spacing={2}>
          <Badge colorScheme={project.role === 'owner' ? 'purple' : 'gray'}>
            {project.role === 'owner' ? 'Owner' : 'Member'}
          </Badge>
          <Badge colorScheme={healthColors[project.health]}>
            {healthLabels[project.health]}
          </Badge>
        </HStack>
      </HStack>

      <SimpleGrid columns={3} spacing={3} mb={3}>
        <Stat size="sm">
          <StatLabel>Completed</StatLabel>
          <StatNumber fontSize="lg">
            {project.summary.completedInPeriod}
          </StatNumber>
        </Stat>
        <Stat size="sm">
          <StatLabel>In Progress</StatLabel>
          <StatNumber fontSize="lg">{project.summary.inProgress}</StatNumber>
        </Stat>
        <Stat size="sm">
          <StatLabel>Throughput</StatLabel>
          <StatNumber fontSize="lg">{project.throughputAvg}/day</StatNumber>
        </Stat>
      </SimpleGrid>

      {project.cycleTime.count > 0 && (
        <Text fontSize="xs" color={reasonColor} mb={2}>
          Cycle time: {project.cycleTime.avg}h avg / {project.cycleTime.median}h
          median
        </Text>
      )}

      {project.healthReasons.length > 0 && (
        <List spacing={0} mt={2}>
          {project.healthReasons.map((reason, i) => (
            <ListItem key={i} fontSize="xs" color={reasonColor}>
              {reason}
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

export default ProjectHealthCard;
