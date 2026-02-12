import { Box, Button, HStack, Badge } from '@chakra-ui/react';

export type ProjectView = 'board' | 'backlog' | 'metrics';

interface ProjectNavigationProps {
  activeView: ProjectView;
  onViewChange: (view: ProjectView) => void;
  backlogCount?: number;
}

export default function ProjectNavigation({
  activeView,
  onViewChange,
  backlogCount,
}: ProjectNavigationProps) {
  return (
    <Box mb={4}>
      <HStack spacing={2} justify="center">
        <Button
          variant={activeView === 'board' ? 'solid' : 'outline'}
          colorScheme={activeView === 'board' ? 'blue' : 'gray'}
          size="sm"
          onClick={() => onViewChange('board')}
        >
          Board
        </Button>
        <Button
          variant={activeView === 'backlog' ? 'solid' : 'outline'}
          colorScheme={activeView === 'backlog' ? 'blue' : 'gray'}
          size="sm"
          rightIcon={
            backlogCount !== undefined && backlogCount > 0 ? (
              <Badge bg="blue.500" color="white" borderRadius="full" fontSize="xs" >
                {backlogCount}
              </Badge>
            ) : undefined
          }
          onClick={() => onViewChange('backlog')}
        >
          Backlog
        </Button>
        <Button
          variant={activeView === 'metrics' ? 'solid' : 'outline'}
          colorScheme={activeView === 'metrics' ? 'blue' : 'gray'}
          size="sm"
          onClick={() => onViewChange('metrics')}
        >
          Metrics
        </Button>
      </HStack>
    </Box>
  );
}
