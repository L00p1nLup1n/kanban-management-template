import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';
import { invitationsAPI } from '../../api/client';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function InviteMemberModal({
  isOpen,
  onClose,
  projectId,
}: InviteMemberModalProps) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setEmail('');
    setMessage('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      await invitationsAPI.send(projectId, {
        email: email.trim(),
        message: message.trim() || undefined,
      });
      toast({
        title: 'Invitation sent',
        description: `An invitation has been sent to ${email}`,
        status: 'success',
        duration: 3000,
      });
      handleClose();
    } catch (err: any) {
      toast({
        title: 'Failed to send invitation',
        description: err?.response?.data?.error || 'Something went wrong',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Invite Member</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Email address</FormLabel>
              <Input
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Message (optional)</FormLabel>
              <Textarea
                placeholder="Add a personal message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                resize="none"
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isLoading}
            isDisabled={!email.trim()}
          >
            Send Invitation
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
