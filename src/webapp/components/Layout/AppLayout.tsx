import { Box } from '@chakra-ui/react';
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar, {
  SIDEBAR_WIDTH_EXPANDED,
  SIDEBAR_WIDTH_COLLAPSED,
} from './Sidebar';

function AppLayout() {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const sidebarWidth = isCollapsed
    ? SIDEBAR_WIDTH_COLLAPSED
    : SIDEBAR_WIDTH_EXPANDED;

  function handleProjectCreated(project: any) {
    const projectId = project?._id || project?.id;
    if (projectId) {
      navigate(`/projects/${projectId}`);
    }
  }

  return (
    <Box display="flex" minH="100vh">
      <Sidebar
        onProjectCreated={handleProjectCreated}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed((prev) => !prev)}
      />
      <Box
        as="main"
        ml={`${sidebarWidth}px`}
        flex={1}
        minH="100vh"
        transition="margin-left 0.2s ease"
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default AppLayout;
