import {
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  VStack,
  HStack,
  Text,
  Button,
  Divider,
  Spinner,
  Center,
  useColorModeValue,
} from '@chakra-ui/react';
import { Notification } from '../../api/client';
import NotificationItem from './NotificationItem';

interface NotificationPopoverProps {
  notifications: Notification[];
  isLoading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  onInvitationResponded?: (notificationId: string) => void;
}

export default function NotificationPopover({
  notifications,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onLoadMore,
  hasMore,
  onInvitationResponded,
}: NotificationPopoverProps) {
  const headerBg = useColorModeValue('gray.50', 'gray.700');
  const contentBg = useColorModeValue('white', 'gray.800');

  return (
    <PopoverContent
      w="340px"
      maxH="450px"
      display="flex"
      flexDirection="column"
      bg={contentBg}
    >
      <PopoverHeader bg={headerBg} borderTopRadius="md" py={2} px={3}>
        <HStack justify="space-between">
          <Text fontWeight="semibold" fontSize="sm">
            Notifications
          </Text>
          {notifications.some((n) => !n.isRead) && (
            <Button
              size="xs"
              variant="ghost"
              colorScheme="blue"
              onClick={onMarkAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </HStack>
      </PopoverHeader>
      <PopoverBody p={0} overflowY="auto" flex={1}>
        {isLoading ? (
          <Center py={8}>
            <Spinner size="sm" />
          </Center>
        ) : notifications.length === 0 ? (
          <Center py={8}>
            <Text fontSize="sm" color="gray.500">
              No notifications
            </Text>
          </Center>
        ) : (
          <VStack spacing={0} align="stretch" divider={<Divider />}>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
                onInvitationResponded={onInvitationResponded}
              />
            ))}
          </VStack>
        )}
      </PopoverBody>
      {hasMore && notifications.length > 0 && (
        <PopoverFooter py={2} textAlign="center">
          <Button size="xs" variant="ghost" onClick={onLoadMore}>
            Load more
          </Button>
        </PopoverFooter>
      )}
    </PopoverContent>
  );
}
