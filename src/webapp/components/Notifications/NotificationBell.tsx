import {
  IconButton,
  Box,
  Popover,
  PopoverTrigger,
  Portal,
  useDisclosure,
} from '@chakra-ui/react';
import { BellIcon } from '@chakra-ui/icons';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationPopover from './NotificationPopover';

interface NotificationBellProps {
  isCollapsed: boolean;
}

export default function NotificationBell({
  isCollapsed,
}: NotificationBellProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchMore,
  } = useNotifications();

  const hasMore = notifications.length > 0 && notifications.length % 20 === 0;

  return (
    <Popover
      isOpen={isOpen}
      onClose={onClose}
      placement={isCollapsed ? 'right-start' : 'bottom-start'}
      isLazy
    >
      <PopoverTrigger>
        <Box position="relative" display="inline-block">
          <IconButton
            aria-label="Notifications"
            icon={<BellIcon />}
            variant="ghost"
            size="sm"
            onClick={onOpen}
          />
          {unreadCount > 0 && (
            <Box
              position="absolute"
              top="-2px"
              right="-2px"
              bg="red.500"
              color="white"
              borderRadius="full"
              fontSize="xs"
              fontWeight="bold"
              minW="18px"
              h="18px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              lineHeight={1}
              pointerEvents="none"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Box>
          )}
        </Box>
      </PopoverTrigger>
      <Portal>
        <NotificationPopover
          notifications={notifications}
          isLoading={isLoading}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDelete={deleteNotification}
          onLoadMore={fetchMore}
          hasMore={hasMore}
        />
      </Portal>
    </Popover>
  );
}
