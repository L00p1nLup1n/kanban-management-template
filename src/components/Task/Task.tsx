import React, { memo, useEffect, useState } from 'react';
import {
  Box,
  IconButton,
  ScaleFade,
  useToast,
  Badge,
  useColorModeValue,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  PopoverFooter,
  Button,
  NumberInput,
  NumberInputField,
  Select,
  HStack,
  useDisclosure,
  Portal,
  Text,
  Avatar,
  FormLabel,
  Input,
  VStack,
} from '@chakra-ui/react';
import { DeleteIcon, EditIcon, CalendarIcon, WarningIcon } from '@chakra-ui/icons';
import { AutoResizeTextArea } from '../AutoResizeTextArea/AutoResizeTextArea';
import { useTaskDragAndDrop } from '../../hooks/useTaskDragAndDrop';
import _ from 'lodash';
import { TaskModel } from '../../utils/models';
import { PopulatedUser } from '../../api/client';

type TaskProps = {
  index: number;
  task: TaskModel;
  onUpdate: (id: TaskModel['id'], patch: Partial<TaskModel>) => void;
  onDelete: (id: TaskModel['id']) => void;
  onDropHover: (i: number, j: number) => void;
  projectMembers?: (string | PopulatedUser)[];
  projectOwnerId?: string | PopulatedUser | null;
};

function Task({ 
  index, 
  task, 
  onUpdate: handleUpdate, 
  onDropHover: handleDropHover, 
  onDelete: handleDelete,
  projectMembers = [],
  projectOwnerId,
}: TaskProps) {
  const { ref, isDragging } = useTaskDragAndDrop<HTMLDivElement>({ task, index }, handleDropHover);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // local editor state
  const [localTitle, setLocalTitle] = useState<string>(task.title);
  const [localSP, setLocalSP] = useState<number>(task.storyPoints ?? 0);
  const [localPriority, setLocalPriority] = useState<TaskModel['priority']>(task.priority ?? 'medium');
  const [localAssigneeId, setLocalAssigneeId] = useState<string>(task.assigneeId || '');
  const [localDueDate, setLocalDueDate] = useState<string>(
    task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  );

  useEffect(() => {
    setLocalTitle(task.title);
    setLocalSP(task.storyPoints ?? 0);
    setLocalPriority(task.priority ?? 'medium');
    setLocalAssigneeId(task.assigneeId || '');
    setLocalDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
  }, [task.title, task.storyPoints, task.priority, task.assigneeId, task.dueDate]);

  const handleSaveAll = () => {
    handleUpdate(task.id, { 
      title: localTitle, 
      storyPoints: Number(localSP), 
      priority: localPriority,
      assigneeId: localAssigneeId || undefined,
      dueDate: localDueDate ? new Date(localDueDate).toISOString() : undefined,
    });
    onClose();
  };

  const handleDeleteClick = () => {
    handleDelete(task.id);
    toast({
      position: 'bottom-left',
      render: () => (
        <Box rounded="lg" color="white" p={2} bg="green.500" textAlign="center">
          Task successfully deleted!
        </Box>
      ),
    });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalTitle(e.target.value);
  };

  // Helper to get user display name
  const getUserDisplay = (userObj: string | PopulatedUser | null | undefined): string => {
    if (!userObj) return 'Unknown';
    if (typeof userObj === 'string') return `User ${userObj.slice(-6)}`;
    return userObj.name || userObj.email || `User ${userObj._id.slice(-6)}`;
  };

  // Helper to get user ID
  const getUserId = (userObj: string | PopulatedUser | null | undefined): string => {
    if (!userObj) return '';
    if (typeof userObj === 'string') return userObj;
    return userObj._id;
  };

  // Build list of all team members (owner + members)
  const allMembers: Array<{ id: string; display: string }> = [];
  
  if (projectOwnerId) {
    const ownerId = getUserId(projectOwnerId);
    if (ownerId) {
      allMembers.push({
        id: ownerId,
        display: getUserDisplay(projectOwnerId),
      });
    }
  }

  projectMembers.forEach(member => {
    const memberId = getUserId(member);
    if (memberId && !allMembers.find(m => m.id === memberId)) {
      allMembers.push({
        id: memberId,
        display: getUserDisplay(member),
      });
    }
  });

  // Get assignee display info
  const getAssigneeDisplay = () => {
    if (!task.assigneeId) return null;
    
    if (task.assignee) {
      return getUserDisplay(task.assignee);
    }
    
    const member = allMembers.find(m => m.id === task.assigneeId);
    return member ? member.display : `User ${task.assigneeId.slice(-6)}`;
  };

  const assigneeDisplay = getAssigneeDisplay();

  // Check if task is overdue
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.column !== 'done';
  
  // Format due date for display
  const formatDueDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const dueDateDisplay = formatDueDate(task.dueDate);

  return (
    <ScaleFade in unmountOnExit>
      <Box
        ref={ref}
        as="div"
        role="group"
        position="relative"
        rounded="lg"
        w={{ base: 220, md: 'full' }}
        pl={3}
        pr={7}
        pt={6}
        pb={1}
        boxShadow="xl"
        cursor="grab"
        fontWeight="bold"
        userSelect="none"
        bgColor={task.color}
        opacity={isDragging ? 0.5 : 1}
      >
        <HStack position="absolute" top={1} left={3} spacing={2} zIndex={0} maxW="calc(100% - 80px)">
          <Badge variant="purple" zIndex={0}>
            {task.storyPoints ?? 0} SP
          </Badge>
          <Badge
            zIndex={0}
            variant={task.priority === 'high' ? 'red' : task.priority === 'low' ? 'green' : 'yellow'}
          >
            {task.priority ?? 'medium'}
          </Badge>
          {/* Deadline badge at top */}
          {task.dueDate && (
            <Badge
              zIndex={0}
              variant={isOverdue ? 'red' : 'blue'}
              display="flex"
              alignItems="center"
              gap={1}
            >
              {isOverdue ? <WarningIcon boxSize={2.5} /> : <CalendarIcon boxSize={2.5} />}
              {dueDateDisplay}
            </Badge>
          )}
        </HStack>

        <Box
          position="absolute"
          right={3}
          top={3}
          bottom={3}
          display={'flex'}
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          zIndex={100}
          pointerEvents={isOpen ? 'none' : 'auto'}
        >
          <Popover isOpen={isOpen} onOpen={onOpen} onClose={onClose} placement="left-end">
            <PopoverTrigger>
							<IconButton aria-label="edit-task" size="md" colorScheme="solid" color={'gray.700'} icon={<EditIcon />} opacity={0} _groupHover={{ opacity: 1 }} />
            </PopoverTrigger>
            <Portal>
              <PopoverContent
                w={64}
                p={2}
                zIndex={99999}
                bg={useColorModeValue('brand.surfaceLight', 'brand.popoverBg')}
                border="1px solid"
                borderColor={useColorModeValue('rgba(2,6,23,0.06)', 'rgba(255,255,255,0.04)')}
                boxShadow={useColorModeValue('0 6px 18px rgba(2,6,23,0.08)', '0 8px 24px rgba(2,8,20,0.55)')}
              >
                <PopoverArrow />
                <PopoverBody>
                  <Box mb={2}>
                    <AutoResizeTextArea
                      value={localTitle}
                      fontWeight="semibold"
                      cursor="text"
                      border="1px solid"
                      p={2}
                      resize="none"
                      minH={10}
                      maxH={60}
                      focusBorderColor="blue.300"
                      color={useColorModeValue('gray.900', '#FFFFFF')}
                      lineHeight={1.5}
                      onChange={handleTitleChange}
                      placeholder="Task name"
                      
                    />
                  </Box>
                  
                  <FormLabel fontSize="sm" mb={1}>Story Points</FormLabel>
                  <NumberInput value={localSP} min={0} onChange={(_, v) => setLocalSP(v)} mb={2}>
                    <NumberInputField />
                  </NumberInput>
                  
                  <FormLabel fontSize="sm" mb={1}>Priority</FormLabel>
                  <Select 
                    mb={2} 
                    value={localPriority} 
                    onChange={(e) => setLocalPriority(e.target.value as TaskModel['priority'])}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Select>

                  <FormLabel fontSize="sm" mb={1}>Assign to</FormLabel>
                  <Select 
                    value={localAssigneeId} 
                    onChange={(e) => setLocalAssigneeId(e.target.value)}
                    placeholder="Unassigned"
                  >
                    {allMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.display}
                      </option>
                    ))}
                  </Select>

                  <FormLabel fontSize="sm" mb={1}>Deadline</FormLabel>
                  <Input 
                    type="date"
                    value={localDueDate}
                    onChange={(e) => setLocalDueDate(e.target.value)}
                    placeholder="No deadline"
                  />
                </PopoverBody>
                <PopoverFooter display="flex" gap={2}>
                  <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
                  <Button size="sm" colorScheme="blue" onClick={handleSaveAll}>Save</Button>
                </PopoverFooter>
              </PopoverContent>
            </Portal>
          </Popover>

          <IconButton aria-label="delete-task" size="md" colorScheme="solid" color={'gray.700'} icon={<DeleteIcon />} opacity={0} _groupHover={{ opacity: 1 }} onClick={handleDeleteClick} />
        </Box>

        <Box as="div" fontWeight="semibold" cursor="inherit" p={0} minH={55} maxH={200} color="gray.900" lineHeight={1.5}>
          {task.title.trim() || 'Untitled task'}
        </Box>

        {/* Show assignee at bottom of card if assigned */}
        {assigneeDisplay && (
          <HStack mt={2} mb={2} spacing={2} alignItems="center">
            <Avatar size="xs" name={assigneeDisplay} bg="blue.500" color="white" />
            <Text fontSize="xs" fontWeight="normal" color="gray.700" noOfLines={1}>
              {assigneeDisplay}
            </Text>
          </HStack>
        )}
      </Box>
    </ScaleFade>
  );
}

export default memo(Task, (prev, next) => {
  if (
    _.isEqual(prev.task, next.task) && 
    _.isEqual(prev.index, next.index) && 
    prev.onDelete === next.onDelete && 
    prev.onDropHover === next.onDropHover && 
    prev.onUpdate === next.onUpdate &&
    _.isEqual(prev.projectMembers, next.projectMembers) &&
    _.isEqual(prev.projectOwnerId, next.projectOwnerId)
  ) {
    return true;
  }
  return false;
});
