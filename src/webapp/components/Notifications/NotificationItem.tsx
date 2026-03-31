import {
  Box,
  Text,
  IconButton,
  HStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';
import { Notification } from '../../api/client';
import { useNavigate } from 'react-router-dom';
import InvitationActions from './InvitationActions';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onInvitationResponded?: (notificationId: string) => void;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onInvitationResponded,
}: NotificationItemProps) {
  const navigate = useNavigate();
  const unreadBg = useColorModeValue('blue.50', 'blue.900');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification._id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  return (
    <Box
      px={3}
      py={2}
      bg={notification.isRead ? 'transparent' : unreadBg}
      _hover={{ bg: hoverBg }}
      cursor="pointer"
      onClick={handleClick}
      position="relative"
    >
      <HStack justify="space-between" align="flex-start" spacing={2}>
        <Box flex={1} minW={0}>
          <HStack spacing={2} align="center">
            {!notification.isRead && (
              <Box
                w="8px"
                h="8px"
                borderRadius="full"
                bg="blue.400"
                flexShrink={0}
              />
            )}
            <Text
              fontSize="sm"
              fontWeight={notification.isRead ? 'normal' : 'semibold'}
              noOfLines={2}
            >
              {notification.title}
            </Text>
          </HStack>
          {notification.message && (
            <Text
              fontSize="xs"
              color={mutedColor}
              noOfLines={1}
              mt={0.5}
              ml={notification.isRead ? 0 : 4}
            >
              {notification.message}
            </Text>
          )}
          <Text
            fontSize="xs"
            color={mutedColor}
            mt={0.5}
            ml={notification.isRead ? 0 : 4}
          >
            {timeAgo(notification.createdAt)}
          </Text>
        </Box>
        <IconButton
          aria-label="Delete notification"
          icon={<CloseIcon />}
          size="xs"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification._id);
          }}
        />
      </HStack>
      {notification.type === 'invitation' &&
        notification.metadata?.invitationId != null &&
        onInvitationResponded && (
          <InvitationActions
            invitationId={String(notification.metadata.invitationId)}
            notificationId={notification._id}
            onResponded={onInvitationResponded}
          />
        )}
    </Box>
  );
}
