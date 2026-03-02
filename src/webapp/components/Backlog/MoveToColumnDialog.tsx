import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  HStack,
  Box,
  Text,
  Badge,
  Radio,
  RadioGroup,
  Stack,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useState } from 'react';
import { ProjectColumn } from '../../hooks/useProjectTasks';

interface MoveToColumnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ProjectColumn[];
  onMove: (columnKey: string) => void;
}

export default function MoveToColumnDialog({
  isOpen,
  onClose,
  columns,
  onMove,
}: MoveToColumnDialogProps) {
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);

  // Filter out any backlog columns if they still exist
  const boardColumns = columns.filter((c) => c.key !== 'backlog');

  const handleMove = async () => {
    if (!selectedColumn) return;
    setIsMoving(true);
    await onMove(selectedColumn);
    setIsMoving(false);
    setSelectedColumn('');
  };

  const handleClose = () => {
    setSelectedColumn('');
    onClose();
  };

  // Helper to check if column has WIP limit
  const getWipStatus = (column: ProjectColumn) => {
    if (!column.wip || column.wip <= 0) return null;
    return {
      limit: column.wip,
      // Note: We don't have actual task count here, that validation happens server-side
    };
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Move to Column</ModalHeader>
        <ModalBody>
          <Text mb={4} color="gray.600">
            Select a column to move this task to:
          </Text>

          {boardColumns.length === 0 ? (
            <Alert status="warning">
              <AlertIcon />
              No columns available. Please create columns in board settings.
            </Alert>
          ) : (
            <RadioGroup value={selectedColumn} onChange={setSelectedColumn}>
              <Stack spacing={3}>
                {boardColumns.map((column) => {
                  const wipStatus = getWipStatus(column);

                  return (
                    <Box
                      key={column.key}
                      p={3}
                      borderWidth={1}
                      borderRadius="md"
                      borderColor={
                        selectedColumn === column.key ? 'blue.500' : undefined
                      }
                      // bg={selectedColumn === column.key ? 'blue.500' : undefined}
                      cursor="pointer"
                      onClick={() => setSelectedColumn(column.key)}
                      _hover={{ borderColor: 'gray' }}
                      transition="all 0.2s"
                    >
                      <Radio value={column.key}>
                        <HStack spacing={2} ml={2}>
                          <Text fontWeight="medium">{column.title}</Text>
                          {wipStatus && (
                            <Badge colorScheme="purple" variant="outline">
                              WIP: {wipStatus.limit}
                            </Badge>
                          )}
                        </HStack>
                      </Radio>
                    </Box>
                  );
                })}
              </Stack>
            </RadioGroup>
          )}

          <Text mt={4} fontSize="sm" color="gray.500">
            Note: If the selected column has a WIP limit and is at capacity, the
            move may be blocked.
          </Text>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleMove}
            isLoading={isMoving}
            isDisabled={!selectedColumn || boardColumns.length === 0}
          >
            Move Task
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
