// column is a free-form string key to support custom columns
import {
    Badge,
    Box,
    Flex,
    Heading,
    IconButton,
    Stack,
    useColorModeValue,
    Progress
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import Task from '../Task/Task';
import useColumnDrop from '../../hooks/useColumnDrop';
import { TaskModel } from '../../utils/models';
import { PopulatedUser } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

// Helper to get user ID from PopulatedUser or string
function getUserId(userObj: string | PopulatedUser | null | undefined): string | null {
    if (!userObj) return null;
    if (typeof userObj === 'string') return userObj;
    return userObj._id;
}

function ProjectColumn({
    column,
    title,
    tasks,
    onCreate,
    onUpdate,
    onDelete,
    onDropFrom,
    onReorder,
    projectMembers,
    projectOwnerId,
    wipLimit
}: {
    // internal column key
    column: string;
    // user-facing title (optional). If omitted, `column` is used.
    title?: string;
    tasks: TaskModel[];
    onCreate: (column: string) => void;
    onUpdate: (id: string, patch: Partial<TaskModel>) => void;
    onDelete: (id: string) => void;
    onDropFrom: (from: string, taskId: string) => void;
    onReorder?: (fromIndex: number, toIndex: number) => void;
    projectMembers?: (string | PopulatedUser)[];
    projectOwnerId?: string | PopulatedUser | null;
    wipLimit?: number;
}) {
    const { dropRef, isOver } = useColumnDrop(column, onDropFrom);
    const { user } = useAuth();

    // Color mode values - must be called unconditionally
    const buttonColor = useColorModeValue('gray.800', 'gray.600');

    // Check if current user is the project owner
    const isOwner = user && projectOwnerId && getUserId(projectOwnerId) === user.id;

    const currentCount = tasks.length;
    const isWipExceed = wipLimit !== undefined && wipLimit > 0 && currentCount > wipLimit;
    const isWipNearLimit = wipLimit !== undefined && wipLimit > 0 && currentCount === wipLimit;
    const showWipIndicator = wipLimit !== undefined && wipLimit > 0;
    const wipBadgeColor = isWipExceed ? 'red' : isWipNearLimit ? 'yellow' : 'gray';

    const ColumnTasks = tasks.map((task, index) => (
        <Task
            key={task.id}
            task={task}
            index={index}
            onDropHover={(fromIndex, toIndex) => onReorder && onReorder(fromIndex, toIndex)}
            onUpdate={onUpdate}
            onDelete={onDelete}
            projectMembers={projectMembers}
            projectOwnerId={projectOwnerId}
        />
    ));

    return (
        <Box w="full" minW={0} display="flex" flexDirection="column">
            <Flex align="center" gap={2}>
                <Heading flex="1" minW={0} letterSpacing="wide" textAlign="center">
                    <Badge
                        display="block"
                        flex="1"
                        minW={0}
                        px={{ base: 3, md: 6 }}
                        py={3}
                        rounded="xl"
                        fontSize={{ base: 'sm', md: 'lg' }}
                        textTransform="none"
                        overflow="hidden"
                        whiteSpace="nowrap"
                        textOverflow="ellipsis"
                        colorScheme={showWipIndicator ? wipBadgeColor : undefined}
                    >
                        {title ?? column}
                        {" "}
                        {showWipIndicator && `(${currentCount}/${wipLimit})`}
                    </Badge>


                </Heading>
                {/* Only show create button to project owner */}
                {isOwner && (
                    <IconButton
                        size="sm"
                        minW="44px"
                        color={buttonColor}
                        rounded="xl"
                        variant="solid"
                        fontSize="lg"
                        onClick={() => onCreate(column)}
                        aria-label="add-task"
                        icon={<AddIcon />}
                    />
                )}
            </Flex>
            <Stack
                ref={dropRef}
                direction={{ base: 'row', md: 'column' }}
                minH={{ base: 200, md: '60vh' }}
                p={3}
                mt={2}
                spacing={4}
                bgColor={useColorModeValue('gray.50', 'gray.900')}
                rounded="lg"
                boxShadow="md"
                overflow="auto"
                opacity={isOver ? 0.85 : 1}
                flexGrow={1}
                minW={0}
            >
                {ColumnTasks}
            </Stack>
        </Box>
    );
}

export default ProjectColumn;
