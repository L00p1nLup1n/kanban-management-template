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
import useUserSocket from '../../hooks/useUserSocket';
import { DeleteIcon } from '@chakra-ui/icons';
import { getRoleLabel, getRoleColor } from '../../utils/roles';
import { ProjectMember } from '../../api/client';

function RoleBadge({
  members,
  currentUserId,
}: {
  members?: ProjectMember[];
  currentUserId: string;
}) {
  const member = members?.find(
    (m) =>
      (typeof m.userId === 'string' ? m.userId : m.userId?._id) ===
      currentUserId,
  );
  if (member?.role) {
    return (
      <Badge colorScheme={getRoleColor(member.role)}>
        {getRoleLabel(member.role)}
      </Badge>
    );
  }
  return <Badge colorScheme="gray">Member</Badge>;
}

function ProjectsList() {
  const { user } = useAuth();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.700');
  const sectionBg = useColorModeValue('gray.50', 'gray.800');

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // join form
  const [joinCode, setJoinCode] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await projectsAPI.list();
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

  useUserSocket(user?.id, {
    'user:removed-from-project': (data: any) => {
      const projectId = data?.projectId;
      const projectName = data?.projectName;

      if (projectId) {
        setProjects((prevProjects) =>
          prevProjects.filter((p) => p._id !== projectId),
        );
      }

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

      if (project && project._id) {
        setProjects((prevProjects) => {
          const exists = prevProjects.some((p) => p._id === project._id);
          if (exists) return prevProjects;

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

  async function handleJoin() {
    try {
      await projectsAPI.joinByCode(joinCode);
      setJoinCode('');
    } catch (err: unknown) {
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
      setProjects((prevProject) =>
        prevProject.filter((p) => p._id !== projectId),
      );
      toast({ title: 'Project deleted', status: 'success' });
    } catch {
      toast({ title: 'Delete failed', status: 'error' });
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={6}>
        <Heading>My Projects</Heading>

        <Box p={6} bg={sectionBg} borderRadius="md" maxW="md">
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
              const projectOwnerId =
                typeof p.ownerId === 'object' && p.ownerId?._id
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
                    <Box flex="1">
                      <Text fontWeight="bold" mb={2}>
                        <ChakraLink
                          as={RouterLink}
                          to={`/projects/${p._id}`}
                          color="blue.500"
                        >
                          {p.name}
                        </ChakraLink>
                      </Text>
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        {p.description}
                      </Text>
                    </Box>

                    <VStack align="flex-end" spacing={1}>
                      <HStack spacing={2}>
                        {isOwner ? (
                          <Badge colorScheme="purple">Owner</Badge>
                        ) : (
                          <RoleBadge
                            members={p.members}
                            currentUserId={currentUserId}
                          />
                        )}

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
