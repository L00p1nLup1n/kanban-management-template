import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  Select,
} from '@chakra-ui/react';
import { useState } from 'react';
import { ProjectMember, PopulatedUser } from '../../api/client';

interface CreateBacklogTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    title: string;
    assigneeId?: string;
    dueDate?: string;
  }) => Promise<void>;
  projectMembers?: ProjectMember[];
}

function getMemberId(userId: PopulatedUser | string): string {
  if (typeof userId === 'string') return userId;
  return userId._id;
}

function getMemberLabel(userId: PopulatedUser | string): string {
  if (typeof userId === 'string') return userId;
  return userId.name || userId.email;
}

export default function CreateBacklogTaskModal({
  isOpen,
  onClose,
  onConfirm,
  projectMembers,
}: CreateBacklogTaskModalProps) {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const reset = () => {
    setTitle('');
    setAssigneeId('');
    setDueDate('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsLoading(true);
    try {
      await onConfirm({
        title: title.trim(),
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined,
      });
      reset();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>New Backlog Item</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Title</FormLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && title.trim()) handleSubmit();
                }}
              />
            </FormControl>

            {projectMembers && projectMembers.length > 0 && (
              <FormControl>
                <FormLabel>Assignee</FormLabel>
                <Select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  placeholder="Unassigned"
                >
                  {projectMembers.map((m) => (
                    <option
                      key={getMemberId(m.userId)}
                      value={getMemberId(m.userId)}
                    >
                      {getMemberLabel(m.userId)}
                    </option>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl>
              <FormLabel>Due Date</FormLabel>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
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
            isDisabled={!title.trim()}
            isLoading={isLoading}
          >
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
