import { Box, Heading, Text, Button, VStack, Icon, useColorModeValue } from '@chakra-ui/react';
import { WarningIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';

interface ProjectNotFoundProps {
    message?: string;
}

export default function ProjectNotFound({ message }: ProjectNotFoundProps) {
    const navigate = useNavigate();
    const bgColor = useColorModeValue('gray.50', 'gray.900');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const textColor = useColorModeValue('gray.600', 'gray.400');

    return (
        <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minH="100vh"
            bg={bgColor}
            px={4}
        >
            <VStack
                spacing={6}
                maxW="md"
                w="full"
                p={8}
                borderRadius="lg"
                border="2px dashed"
                borderColor={borderColor}
                textAlign="center"
            >
                <Icon as={WarningIcon} boxSize={16} color="orange.500" />
                
                <Heading size="lg">Project Not Found</Heading>
                
                <Text color={textColor} fontSize="md">
                    {message || 'The project you\'re looking for doesn\'t exist or you don\'t have access to it.'}
                </Text>

                <VStack spacing={3} w="full" pt={4}>
                    <Button
                        colorScheme="blue"
                        size="lg"
                        w="full"
                        onClick={() => navigate('/projects')}
                    >
                        Back to Projects
                    </Button>
                    
                    <Button
                        variant="ghost"
                        size="md"
                        onClick={() => navigate('/')}
                    >
                        Go to Home
                    </Button>
                </VStack>
            </VStack>
        </Box>
    );
}