import { HStack, Button, Text, useToast } from '@chakra-ui/react';
import { useState } from 'react';
import { invitationsAPI } from '../../api/client';

interface InvitationActionsProps {
  invitationId: string;
  notificationId: string;
  onResponded: (notificationId: string) => void;
}

export default function InvitationActions({
  invitationId,
  notificationId,
  onResponded,
}: InvitationActionsProps) {
  const toast = useToast();
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined'>(
    'pending',
  );
  const [isLoading, setIsLoading] = useState<'accept' | 'decline' | null>(null);

  const handleAccept = async () => {
    setIsLoading('accept');
    try {
      await invitationsAPI.accept(invitationId);
      setStatus('accepted');
      onResponded(notificationId);
      toast({
        title: 'Invitation accepted',
        description: 'You have joined the project',
        status: 'success',
        duration: 3000,
      });
    } catch (err: any) {
      toast({
        title: 'Failed to accept invitation',
        description: err?.response?.data?.error || 'Something went wrong',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleDecline = async () => {
    setIsLoading('decline');
    try {
      await invitationsAPI.decline(invitationId);
      setStatus('declined');
      onResponded(notificationId);
      toast({
        title: 'Invitation declined',
        status: 'info',
        duration: 2000,
      });
    } catch (err: any) {
      toast({
        title: 'Failed to decline invitation',
        description: err?.response?.data?.error || 'Something went wrong',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsLoading(null);
    }
  };

  if (status === 'accepted') {
    return (
      <Text fontSize="xs" color="green.500" fontWeight="medium" mt={1} ml={4}>
        Accepted
      </Text>
    );
  }

  if (status === 'declined') {
    return (
      <Text fontSize="xs" color="gray.400" mt={1} ml={4}>
        Declined
      </Text>
    );
  }

  return (
    <HStack spacing={2} mt={2} ml={4}>
      <Button
        size="xs"
        colorScheme="green"
        onClick={handleAccept}
        isLoading={isLoading === 'accept'}
        isDisabled={isLoading === 'decline'}
      >
        Accept
      </Button>
      <Button
        size="xs"
        colorScheme="red"
        variant="outline"
        onClick={handleDecline}
        isLoading={isLoading === 'decline'}
        isDisabled={isLoading === 'accept'}
      >
        Decline
      </Button>
    </HStack>
  );
}
