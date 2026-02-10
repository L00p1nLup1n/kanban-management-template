import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Box,
  HStack,
  Input,
  NumberInput,
  NumberInputField,
  IconButton,
  VStack,
  Text,
  useToast,
} from '@chakra-ui/react';
import {
  AddIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DeleteIcon,
} from '@chakra-ui/icons';
import { ProjectColumn as ProjectColumnMeta } from '../../hooks/useProjectTasks';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectColumns: ProjectColumnMeta[];
  saveProjectColumns: (cols: ProjectColumnMeta[]) => Promise<void>;
  onSaved?: () => void;
}

export default function ColumnSettingsModal({
  isOpen,
  onClose,
  projectColumns,
  saveProjectColumns,
  onSaved,
}: Props) {
  const [cols, setCols] = useState<ProjectColumnMeta[]>(projectColumns || []);
  const toast = useToast();
  useEffect(() => {
    if (isOpen) {
      setCols(projectColumns || []);
    }
  }, [isOpen, projectColumns]);

  const addColumn = () => {
    const next = {
      key: `custom-${Date.now()}`,
      title: 'New column',
      wip: undefined,
    } as ProjectColumnMeta;
    setCols((s) => [...s, next]);
  };

  const updateCol = (idx: number, patch: Partial<ProjectColumnMeta>) => {
    setCols((s) => s.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const removeCol = (idx: number) =>
    setCols((s) => s.filter((_, i) => i !== idx));

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    setCols((s) => {
      const arr = [...s];
      const [item] = arr.splice(idx, 1);
      arr.splice(idx - 1, 0, item);
      return arr;
    });
  };

  const moveDown = (idx: number) => {
    setCols((s) => {
      if (idx >= s.length - 1) return s;
      const arr = [...s];
      const [item] = arr.splice(idx, 1);
      arr.splice(idx + 1, 0, item);
      return arr;
    });
  };

  const handleSave = async () => {
    try {
      // ensure order indexes
      const mapped = cols.map((c, idx) => ({ ...c, order: idx }));
      await saveProjectColumns(mapped);
      if (onSaved) onSaved();
    } catch (err: any) {
      // Check if it's a permission error
      const errorMessage =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to save column settings';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Column settings</ModalHeader>
        <ModalBody>
          <VStack align="stretch">
            {cols.map((c, idx) => {
              return (
                <Box key={c.key} p={2} borderWidth={1} borderRadius="md">
                  <HStack>
                    <Input
                      value={c.title}
                      onChange={(e) =>
                        updateCol(idx, { title: e.target.value })
                      }
                    />
                    <NumberInput
                      value={c.wip ?? 0}
                      min={0}
                      onChange={(_, val) =>
                        updateCol(idx, {
                          wip: val === 0 ? undefined : Number(val),
                        })
                      }
                    >
                      <NumberInputField />
                    </NumberInput>
                    <IconButton
                      aria-label="up"
                      icon={<ArrowUpIcon />}
                      size="sm"
                      onClick={() => moveUp(idx)}
                      isDisabled={idx === 0}
                    />
                    <IconButton
                      aria-label="down"
                      icon={<ArrowDownIcon />}
                      size="sm"
                      onClick={() => moveDown(idx)}
                      isDisabled={idx === cols.length - 1}
                    />
                    <IconButton
                      aria-label="remove"
                      icon={<DeleteIcon />}
                      size="sm"
                      onClick={() => removeCol(idx)}
                    />
                  </HStack>
                </Box>
              );
            })}
            <Button
              leftIcon={<AddIcon />}
              size="sm"
              onClick={addColumn}
              alignSelf="start"
            >
              Add column
            </Button>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
