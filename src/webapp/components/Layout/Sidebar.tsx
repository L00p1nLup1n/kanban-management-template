import {
  Box,
  VStack,
  Button,
  Text,
  Divider,
  IconButton,
  Tooltip,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { AddIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { createIcon } from '@chakra-ui/react';
import { NavLink, useLocation } from 'react-router-dom';

const PowerIcon = createIcon({
  displayName: 'PowerIcon',
  viewBox: '0 0 24 24',
  path: (
    <>
      <path
        d="M12 2v10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M18.36 6.64A9 9 0 1 1 5.64 6.64"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
});
import { useAuth } from '../../hooks/useAuth';
import DarkModeIconButton from '../DarkModeIconButton/DarkModeIconButton';
import CreateProjectModal from './CreateProjectModal';

export const SIDEBAR_WIDTH_EXPANDED = 240;
export const SIDEBAR_WIDTH_COLLAPSED = 60;

interface SidebarProps {
  onProjectCreated: (project: any) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

function Sidebar({ onProjectCreated, isCollapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const activeBg = useColorModeValue('blue.50', 'blue.900');
  const activeColor = useColorModeValue('blue.600', 'blue.200');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');

  const isPM = user?.role === 'project_manager';
  const width = isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  function navLinkStyle(path: string) {
    const isActive =
      location.pathname === path || location.pathname.startsWith(path + '/');
    return {
      bg: isActive ? activeBg : 'transparent',
      color: isActive ? activeColor : undefined,
      borderLeft: isActive ? '3px solid' : '3px solid transparent',
      borderLeftColor: isActive ? activeColor : 'transparent',
      _hover: { bg: isActive ? activeBg : hoverBg },
    };
  }

  return (
    <>
      <Box
        as="nav"
        position="fixed"
        left={0}
        top={0}
        bottom={0}
        width={`${width}px`}
        bg={bg}
        borderRight="1px solid"
        borderColor={borderColor}
        display="flex"
        flexDirection="column"
        zIndex={10}
        transition="width 0.2s ease"
        overflow="hidden"
      >
        {/* Collapse toggle */}
        <Box
          display="flex"
          justifyContent={isCollapsed ? 'center' : 'flex-end'}
          p={1}
        >
          <IconButton
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            icon={isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            size="xs"
            variant="ghost"
            onClick={onToggle}
          />
        </Box>

        {/* Top section */}
        {isPM && (
          <VStack spacing={2} px={isCollapsed ? 2 : 4} pb={2} align="stretch">
            {isCollapsed ? (
              <Tooltip label="New Project" placement="right">
                <IconButton
                  aria-label="New Project"
                  icon={<AddIcon />}
                  colorScheme="blue"
                  size="sm"
                  onClick={onOpen}
                />
              </Tooltip>
            ) : (
              <Button
                leftIcon={<AddIcon />}
                colorScheme="blue"
                size="sm"
                onClick={onOpen}
                width="full"
              >
                New Project
              </Button>
            )}
          </VStack>
        )}

        <Divider />

        {/* Navigation */}
        <VStack spacing={1} p={2} align="stretch" flex={1}>
          {isCollapsed ? (
            <Tooltip label="Projects" placement="right">
              <IconButton
                as={NavLink}
                to="/projects"
                aria-label="Projects"
                icon={
                  <Text fontSize="sm" fontWeight="bold">
                    P
                  </Text>
                }
                variant="ghost"
                size="sm"
                {...navLinkStyle('/projects')}
              />
            </Tooltip>
          ) : (
            <Button
              as={NavLink}
              to="/projects"
              variant="ghost"
              justifyContent="flex-start"
              size="sm"
              fontWeight="medium"
              borderRadius="md"
              px={3}
              py={2}
              {...navLinkStyle('/projects')}
            >
              Projects
            </Button>
          )}

          {isPM &&
            (isCollapsed ? (
              <Tooltip label="Dashboard" placement="right">
                <IconButton
                  as={NavLink}
                  to="/dashboard"
                  aria-label="Dashboard"
                  icon={
                    <Text fontSize="sm" fontWeight="bold">
                      D
                    </Text>
                  }
                  variant="ghost"
                  size="sm"
                  {...navLinkStyle('/dashboard')}
                />
              </Tooltip>
            ) : (
              <Button
                as={NavLink}
                to="/dashboard"
                variant="ghost"
                justifyContent="flex-start"
                size="sm"
                fontWeight="medium"
                borderRadius="md"
                px={3}
                py={2}
                {...navLinkStyle('/dashboard')}
              >
                Dashboard
              </Button>
            ))}

          {!isPM &&
            (isCollapsed ? (
              <Tooltip label="My Tasks" placement="right">
                <IconButton
                  as={NavLink}
                  to="/my-tasks"
                  aria-label="My Tasks"
                  icon={
                    <Text fontSize="sm" fontWeight="bold">
                      T
                    </Text>
                  }
                  variant="ghost"
                  size="sm"
                  {...navLinkStyle('/my-tasks')}
                />
              </Tooltip>
            ) : (
              <Button
                as={NavLink}
                to="/my-tasks"
                variant="ghost"
                justifyContent="flex-start"
                size="sm"
                fontWeight="medium"
                borderRadius="md"
                px={3}
                py={2}
                {...navLinkStyle('/my-tasks')}
              >
                My Tasks
              </Button>
            ))}
        </VStack>

        <Divider />

        {/* Bottom section — user info */}
        <VStack
          spacing={2}
          p={isCollapsed ? 2 : 4}
          align={isCollapsed ? 'center' : 'stretch'}
        >
          {!isCollapsed && (
            <Text fontSize="sm" noOfLines={1}>
              {user?.name || user?.email || 'Guest'}
            </Text>
          )}
          <Box
            display="flex"
            flexDirection={isCollapsed ? 'column' : 'row'}
            gap={2}
            alignItems="center"
          >
            <DarkModeIconButton
              size="xs"
              bgColor="transparent"
              _hover={{ bg: hoverBg }}
            />
            {isCollapsed ? (
              <Tooltip label="Sign Out" placement="right">
                <IconButton
                  aria-label="Sign Out"
                  onClick={logout}
                  variant="outline"
                  colorScheme="red"
                  size="sm"
                  icon={<PowerIcon />}
                />
              </Tooltip>
            ) : (
              <Button
                onClick={logout}
                variant="outline"
                colorScheme="red"
                size="xs"
                flex={1}
              >
                Sign Out
              </Button>
            )}
          </Box>
        </VStack>
      </Box>

      <CreateProjectModal
        isOpen={isOpen}
        onClose={onClose}
        onProjectCreated={onProjectCreated}
      />
    </>
  );
}

export default Sidebar;
