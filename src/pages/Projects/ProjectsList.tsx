import {
  Container,
  Heading,
  Text,
  Stack,
  Box,
  Button,
  useColorModeValue,
  Input,
  FormControl,
  FormLabel,
  SimpleGrid,
  Badge,
  HStack,
  VStack,
  useToast,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { projectsAPI, Project } from '../../api/client';
import { Link as RouterLink } from 'react-router-dom';
import DarkModeIconButton from '../../components/DarkModeIconButton/DarkModeIconButton';

function ProjectsList() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const sectionBg = useColorModeValue('gray.50', 'gray.800');

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // join form
  const [joinCode, setJoinCode] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await projectsAPI.list();
      setProjects(res.data.projects || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Failed to load projects', description: msg, status: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    try {
      const res = await projectsAPI.create({ name, description });
      setProjects(p => [res.data.project, ...p]);
      setName('');
      setDescription('');
      toast({ title: 'Project created', status: 'success' });
    } catch (err: unknown) {
      // try to extract API error message
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : String(err));
      toast({ title: msg || 'Create failed', status: 'error' });
    }
  }

  async function handleJoin() {
    try {
      const res = await projectsAPI.joinByCode(joinCode);
      // If join succeeded, reload projects
      await load();
      setJoinCode('');
      toast({ title: 'Joined project', status: 'success' });
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.error || (err instanceof Error ? err.message : String(err));
      toast({ title: msg || 'Join failed', status: 'error' });
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={6}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading>My Projects</Heading>
          <Box display="flex" gap={3} alignItems="center">
            <DarkModeIconButton size="sm" bgColor="transparent" _hover={{ bg: 'gray.100' }} />
            <Text fontSize={{ base: 'sm', md: 'md' }}>Hello, {user?.name || user?.email || 'Guest'}</Text>
            <Button onClick={logout} variant="outline" colorScheme="red">
              Sign Out
            </Button>
          </Box>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Box p={6} bg={useColorModeValue('gray.50', 'gray.800')} borderRadius="md">
            <VStack align="stretch">
              <Text fontWeight="semibold">Create a new project</Text>
              <FormControl>
                <FormLabel>Project name</FormLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Description (optional)</FormLabel>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </FormControl>
              <HStack>
                <Button colorScheme="blue" onClick={handleCreate} isDisabled={!name}>
                  Create
                </Button>
              </HStack>
            </VStack>
          </Box>

          <Box p={6} bg={useColorModeValue('gray.50', 'gray.800')} borderRadius="md">
            <VStack align="stretch">
              <Text fontWeight="semibold">Join a project</Text>
              <FormControl>
                <FormLabel>Join code</FormLabel>
                <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="e.g. ab12cd" />
              </FormControl>
              <HStack>
                <Button colorScheme="green" onClick={handleJoin} isDisabled={!joinCode}>
                  Join
                </Button>
              </HStack>
            </VStack>
          </Box>
        </SimpleGrid>

        <Box>
          <Heading size="md" mb={4}>Your projects</Heading>
          <Stack spacing={4}>
            {loading && <Text>Loading...</Text>}
            {!loading && projects.length === 0 && (
              <Text color="gray.600">No projects yet.</Text>
            )}
            {projects.map((p) => (
              <Box key={p._id} p={4} borderRadius="md" bg={cardBg} boxShadow="sm">
                <HStack justify="space-between">
                  <Box>
                    <Text fontWeight="bold">
                      <ChakraLink as={RouterLink} to={`/projects/${p._id}`} color="blue.500">
                        {p.name}
                      </ChakraLink>
                    </Text>
                    <Text fontSize="sm" color="gray.500">{p.description}</Text>
                  </Box>
                  <Box textAlign="right">
                    {p.ownerId === user?.id ? (
                      <Badge colorScheme="purple">Owner</Badge>
                    ) : (
                      <Badge>Member</Badge>
                    )}
                    {p.joinCode && (
                      <Text fontSize="xs" color="gray.400">Join code: <strong>{p.joinCode}</strong></Text>
                    )}
                  </Box>
                </HStack>
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}

export default ProjectsList;
