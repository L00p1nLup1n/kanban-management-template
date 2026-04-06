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
import DateInput from '../DateInput/DateInput';
import { useState, useEffect } from 'react';
import { ProjectMember, PopulatedUser } from '../../api/client';
import { BacklogTaskModel } from '../../hooks/useBacklog';

interface EditBacklogTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** null = create mode, BacklogTaskModel = edit mode */
  task: BacklogTaskModel | null;
  onConfirm: (
    data: Partial<BacklogTaskModel> & { title: string },
  ) => Promise<void>;
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

export default function EditBacklogTaskModal({
  isOpen,
  onClose,
  task,
  onConfirm,
  projectMembers,
}: EditBacklogTaskModalProps) {
  const isCreate = task === null;

  const [title, setTitle] = useState('');
  const [priority, setPriority] =
    useState<BacklogTaskModel['priority']>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [cost, setCost] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(task?.title ?? '');
      setPriority(task?.priority ?? 'medium');
      setAssigneeId(task?.assigneeId ?? '');
      setDueDate(task?.dueDate ? task.dueDate.slice(0, 10) : '');
      setCost(task?.cost != null ? String(task.cost) : '');
    }
  }, [isOpen, task]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsLoading(true);
    try {
      await onConfirm({
        title: title.trim(),
        priority: priority || undefined,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined,
        cost: cost ? Number(cost) : undefined,
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isCreate ? 'New Backlog Item' : 'Edit Task'}</ModalHeader>
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

            <FormControl>
              <FormLabel>Priority</FormLabel>
              <Select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as BacklogTaskModel['priority'])
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
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
              <DateInput
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Cost (optional)</FormLabel>
              <Input
                type="number"
                min={0}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 500"
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isDisabled={!title.trim()}
            isLoading={isLoading}
          >
            {isCreate ? 'Create' : 'Save'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
