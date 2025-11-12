import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    VStack,
    HStack,
    Text,
    Badge,
    Box,
    Divider,
    Button,
    useClipboard,
    useToast,
    useColorModeValue,
} from '@chakra-ui/react';
import { CopyIcon } from '@chakra-ui/icons';
import { useAuth } from '../../hooks/useAuth';
import { PopulatedUser } from '../../api/client';

interface MembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    ownerId: string | PopulatedUser | null;
    members: (string | PopulatedUser)[];
    joinCode?: string;
}

export default function MembersModal({ isOpen, onClose, ownerId, members, joinCode }: MembersModalProps) {
    const { user } = useAuth();
    const { onCopy, hasCopied } = useClipboard(joinCode || '');
    const toast = useToast();

    // Color mode values
    const ownerBg = useColorModeValue('purple.50', 'purple.900');
    const memberBg = useColorModeValue('gray.50', 'gray.700');
    const joinCodeBg = useColorModeValue('gray.100', 'gray.900');
    const joinCodeColor = useColorModeValue('gray.800', 'white');
    const labelColor = useColorModeValue('gray.500', 'gray.400');
    const emptyTextColor = useColorModeValue('gray.400', 'gray.500');
    const joinCodeBorderColor = useColorModeValue('gray.200', 'gray.700');

    // Helper function to get user display name
    const getDisplayName = (userObj: string | PopulatedUser | null | undefined, isCurrentUser: boolean): string => {
        if (isCurrentUser) return 'You';
        if (!userObj) return 'Unknown User';
        if (typeof userObj === 'string') return `User ${userObj.slice(-6)}`;
        return userObj.name || userObj.email || `User ${userObj._id.slice(-6)}`;
    };

    // Helper function to get user ID
    const getUserId = (userObj: string | PopulatedUser | null | undefined): string => {
        if (!userObj) return '';
        if (typeof userObj === 'string') return userObj;
        return userObj._id;
    };

    const ownerId_str = getUserId(ownerId);
    const isOwnerCurrentUser = ownerId_str === user?.id;

    const handleCopyJoinCode = () => {
        onCopy();
        toast({
            title: 'Join code copied!',
            status: 'success',
            duration: 2000,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Project Members</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <VStack align="stretch" spacing={3}>
                        {/* Owner Section */}
                        <Box>
                            <Text fontSize="sm" fontWeight="bold" mb={2} color={labelColor}>
                                Owner
                            </Text>
                            <HStack justify="space-between" p={3} bg={ownerBg} borderRadius="md">
                                <Text>
                                    {getDisplayName(ownerId, isOwnerCurrentUser)}
                                </Text>
                                <Badge colorScheme="purple">Owner</Badge>
                            </HStack>
                        </Box>

                        <Divider />

                        {/* Members Section */}
                        <Box>
                            <Text fontSize="sm" fontWeight="bold" mb={2} color={labelColor}>
                                Members ({members.length})
                            </Text>
                            <VStack align="stretch" spacing={2}>
                                {members.length === 0 ? (
                                    <Text fontSize="sm" color={emptyTextColor}>
                                        No members yet. Share the join code to invite people!
                                    </Text>
                                ) : (
                                    members.map((member) => {
                                        const memberId = getUserId(member);
                                        const isMemberCurrentUser = memberId === user?.id;
                                        return (
                                            <HStack key={memberId} justify="space-between" p={3} bg={memberBg} borderRadius="md">
                                                <Text>
                                                    {getDisplayName(member, isMemberCurrentUser)}
                                                </Text>
                                                <Badge>Member</Badge>
                                            </HStack>
                                        );
                                    })
                                )}
                            </VStack>
                        </Box>

                        {/* Join Code Section */}
                        {joinCode && (
                            <>
                                <Divider />
                                <Box>
                                    <Text fontSize="sm" fontWeight="bold" mb={2} color={labelColor}>
                                        Invite Link
                                    </Text>
                                    <HStack>
                                        <Box 
                                            flex="1" 
                                            p={3} 
                                            bg={joinCodeBg} 
                                            borderRadius="md"
                                            border="1px solid"
                                            borderColor={joinCodeBorderColor}
                                        >
                                            <Text 
                                                fontFamily="mono" 
                                                fontSize="lg" 
                                                fontWeight="bold"
                                                color={joinCodeColor}
                                            >
                                                {joinCode}
                                            </Text>
                                        </Box>
                                        <Button
                                            leftIcon={<CopyIcon />}
                                            onClick={handleCopyJoinCode}
                                            colorScheme={hasCopied ? 'green' : 'blue'}
                                        >
                                            {hasCopied ? 'Copied!' : 'Copy'}
                                        </Button>
                                    </HStack>
                                    <Text fontSize="xs" color={labelColor} mt={2}>
                                        Share this code with others to invite them to the project
                                    </Text>
                                </Box>
                            </>
                        )}
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}
