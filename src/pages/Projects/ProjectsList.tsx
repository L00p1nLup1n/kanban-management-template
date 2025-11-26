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
  IconButton,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { projectsAPI, Project } from '../../api/client';
import { Link as RouterLink } from 'react-router-dom';
import DarkModeIconButton from '../../components/DarkModeIconButton/DarkModeIconButton';
import useUserSocket from '../../hooks/useUserSocket';
import { DeleteIcon } from '@chakra-ui/icons';

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
      // Normalize ownerId to a string in case backend populated it as an object
      const raw = res.data.projects || [];
      const normalizeProject = (pRaw: unknown) => {
        const proj = pRaw as Record<string, unknown>;
        const ownerRaw = proj.ownerId;
        const ownerId =
          ownerRaw &&
          typeof ownerRaw === 'object' &&
          '_id' in (ownerRaw as Record<string, unknown>)
            ? String((ownerRaw as Record<string, unknown>)['_id'])
            : String(ownerRaw || '');

        const membersArr = Array.isArray(proj.members)
          ? (proj.members as unknown[]).map((m: unknown) => {
              if (
                m &&
                typeof m === 'object' &&
                '_id' in (m as Record<string, unknown>)
              )
                return String((m as Record<string, unknown>)['_id']);
              if (typeof m === 'string') return m;
              return String(m || '');
            })
          : [];

        return {
          ...(proj as Record<string, unknown>),
          ownerId,
          members: membersArr,
        } as unknown as typeof raw[number];
      };

      const normalized = raw.map(normalizeProject);
      setProjects(normalized);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({
        title: 'Failed to load projects',
        description: msg,
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for user-specific socket events (e.g., being removed from a project)
  useUserSocket(user?.id, {
    'user:removed-from-project': (data: any) => {
      const projectId = data?.projectId;
      const projectName = data?.projectName;

      // Remove project from list immediately
      if (projectId) {
        setProjects((prevProjects) =>
          prevProjects.filter((p) => p._id !== projectId),
        );
      }

      // Show notification
      toast({
        title: 'Removed from Project',
        description: projectName
          ? `You have been removed from "${projectName}"`
          : 'You have been removed from a project',
        status: 'warning',
        duration: 5000,
        isClosable: true,
        position: 'bottom-left',
      });
    },
    'user:joined-project': (data: any) => {
      const project = data?.project;

      // Add project to list if not already there
      if (project && project._id) {
        setProjects((prevProjects) => {
          // Check if already in list
          const exists = prevProjects.some((p) => p._id === project._id);
          if (exists) return prevProjects;

          // Normalize project data
          const normalized = {
            ...project,
            ownerId:
              typeof project.ownerId === 'object' && project.ownerId?._id
                ? String(project.ownerId._id)
                : String(project.ownerId || ''),
            members: Array.isArray(project.members)
              ? project.members.map((m: any) =>
                  typeof m === 'object' && m?._id
                    ? String(m._id)
                    : String(m || ''),
                )
              : [],
          };

          return [normalized, ...prevProjects];
        });
      }

      // Show notification
      toast({
        title: 'Joined Project',
        description: project?.name
          ? `Successfully joined "${project.name}"`
          : 'Successfully joined project',
        status: 'success',
        duration: 4000,
        isClosable: true,
        position: 'bottom-left',
      });
    },
  });

  async function handleCreate() {
    try {
      const res = await projectsAPI.create({ name, description });
      // Normalize project shape before inserting so ownerId/members are consistent
      const created = res.data.project as unknown;
      const normalized =
        created && typeof created === 'object'
          ? (() => {
              const c = created as Record<string, unknown>;
              const ownerRaw = c.ownerId;
              const ownerId =
                ownerRaw &&
                typeof ownerRaw === 'object' &&
                '_id' in (ownerRaw as Record<string, unknown>)
                  ? String((ownerRaw as Record<string, unknown>)['_id'])
                  : String(ownerRaw || '');
              const membersArr = Array.isArray(c.members)
                ? (c.members as unknown[]).map((m: unknown) => {
                    if (
                      m &&
                      typeof m === 'object' &&
                      '_id' in (m as Record<string, unknown>)
                    )
                      return String((m as Record<string, unknown>)['_id']);
                    if (typeof m === 'string') return m;
                    return String(m || '');
                  })
                : [];
              return {
                ...(c as Record<string, unknown>),
                ownerId,
                members: membersArr,
              } as unknown as Project;
            })()
          : (res.data.project as Project);
      setProjects((p) => [normalized, ...p]);
      setName('');
      setDescription('');
      toast({ title: 'Project created', status: 'success' });
    } catch (err: unknown) {
      // try to extract API error message
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg =
        (err as any)?.response?.data?.error ||
        (err instanceof Error ? err.message : String(err));
      toast({ title: msg || 'Create failed', status: 'error' });
    }
  }

  async function handleJoin() {
    try {
      const res = await projectsAPI.joinByCode(joinCode);
      // If join succeeded, socket event will handle the notification and list update
      setJoinCode('');
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg =
        (err as any)?.response?.data?.error ||
        (err instanceof Error ? err.message : String(err));
      toast({ title: msg || 'Join failed', status: 'error' });
    }
  }
  async function handleDelete(projectId: string, projectName: string) {
    if (!window.confirm(`Are you sure you want to delete "${projectName}"?`)) {
      return;
    }

    try {
      await projectsAPI.delete(projectId);
      // remove from local state
      setProjects((prevProject) =>
        prevProject.filter((p) => p._id !== projectId),
      );
      toast({ title: 'Project deleted', status: 'success' });
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.error ||
        (err instanceof Error ? err.message : String(err));
      toast({ title: 'Delete failed', status: 'error' });
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={6}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading>My Projects</Heading>
          <Box display="flex" gap={3} alignItems="center">
            <DarkModeIconButton
              size="sm"
              bgColor="transparent"
              _hover={{ bg: 'gray.100' }}
            />
            <Text fontSize={{ base: 'sm', md: 'md' }}>
              Hello, {user?.name || user?.email || 'Guest'}
            </Text>
            <Button onClick={logout} variant="outline" colorScheme="red">
              Sign Out
            </Button>
          </Box>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Box
            p={6}
            bg={useColorModeValue('gray.50', 'gray.800')}
            borderRadius="md"
          >
            <VStack align="stretch">
              <Text fontWeight="semibold">Create a new project</Text>
              <FormControl>
                <FormLabel>Project name</FormLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Description (optional)</FormLabel>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </FormControl>
              <HStack>
                <Button
                  colorScheme="blue"
                  onClick={handleCreate}
                  isDisabled={!name}
                >
                  Create
                </Button>
              </HStack>
            </VStack>
          </Box>

          <Box
            p={6}
            bg={useColorModeValue('gray.50', 'gray.800')}
            borderRadius="md"
          >
            <VStack align="stretch">
              <Text fontWeight="semibold">Join a project</Text>
              <FormControl>
                <FormLabel>Join code</FormLabel>
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. ab12cd"
                />
              </FormControl>
              <HStack>
                <Button
                  colorScheme="green"
                  onClick={handleJoin}
                  isDisabled={!joinCode}
                >
                  Join
                </Button>
              </HStack>
            </VStack>
          </Box>
        </SimpleGrid>

        <Box>
          <Heading size="md" mb={4}>
            Your projects
          </Heading>
          <Stack spacing={4}>
            {loading && <Text>Loading...</Text>}
            {!loading && projects.length === 0 && (
              <Text color="gray.600">No projects yet.</Text>
            )}
            {projects.map((p) => {
              // Normalize and check ownership
              const projectOwnerId = typeof p.ownerId === 'object' && p.ownerId?._id 
                ? String(p.ownerId._id) 
                : String(p.ownerId);
              const currentUserId = String(user?.id);
              const isOwner = projectOwnerId === currentUserId;
              
              return (
                <Box 
                  key={p._id} 
                  p={4} 
                  borderRadius="md" 
                  bg={cardBg} 
                  boxShadow="sm"
                  position="relative"
                  role="group"
                  _hover={{
                    boxShadow: 'md',
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s',
                  }}
                >
                  <HStack justify="space-between" align="flex-start">
                    {/* Left side - Project info */}
                    <Box flex="1">
                      <Text fontWeight="bold" mb={2}>
                        <ChakraLink as={RouterLink} to={`/projects/${p._id}`} color="blue.500">
                          {p.name}
                        </ChakraLink>
                      </Text>
                      <Text fontSize="sm" color="gray.500" mt={1}>{p.description}</Text>
                    </Box>
                    
                    {/* Right side - Badge, Join Code, and Delete Button */}
                    <VStack align="flex-end" spacing={1}>
                      <HStack spacing={2}>
                        {/* Role Badge */}
                        {isOwner ? (
                          <Badge colorScheme="purple">Owner</Badge>
                        ) : p.members && p.members.includes(currentUserId) ? (
                          <Badge>Member</Badge>
                        ) : (
                          <Badge colorScheme="gray">Unknown Role</Badge>
                        )}
                        
                        {/* Delete Button - ONLY for owners */}
                        {isOwner && (
                          <IconButton
                            aria-label={`Delete ${p.name}`}
                            icon={<DeleteIcon />}
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            opacity={0}
                            _groupHover={{ opacity: 1 }}
                            transition="opacity 0.2s"
                            onClick={() => handleDelete(p._id, p.name)}
                          />
                        )}
                      </HStack>
                      
                      {/* Join Code - Below badge/button */}
                      {p.joinCode && (
                        <Text fontSize="xs" color="gray.400">
                          Join code: <strong>{p.joinCode}</strong>
                        </Text>
                      )}
                    </VStack>
                  </HStack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}

export default ProjectsList;
