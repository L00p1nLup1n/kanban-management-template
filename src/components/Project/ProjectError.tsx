import { Box, Heading, Text, Button, VStack, Icon, useColorModeValue } from '@chakra-ui/react';
import { WarningIcon, NotAllowedIcon, InfoIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';

interface ProjectErrorProps {
    status?: number;
    message?: string;
}

export default function ProjectError({ status, message }: ProjectErrorProps) {
    const navigate = useNavigate();
    const bgColor = useColorModeValue('gray.50', 'gray.900');
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const textColor = useColorModeValue('gray.600', 'gray.400');

    // Determine icon, title, and default message based on status code
    const getErrorDetails = () => {
        switch (status) {
            case 404:
                return {
                    icon: WarningIcon,
                    iconColor: 'orange.500',
                    title: 'Project Not Found',
                    defaultMessage: 'The project you\'re looking for doesn\'t exist or has been deleted.',
                };
            case 403:
                return {
                    icon: NotAllowedIcon,
                    iconColor: 'red.500',
                    title: 'Access Denied',
                    defaultMessage: 'You don\'t have permission to access this project.',
                };
            case 401:
                return {
                    icon: NotAllowedIcon,
                    iconColor: 'red.500',
                    title: 'Authentication Required',
                    defaultMessage: 'Please log in to access this project.',
                };
            case 500:
                return {
                    icon: InfoIcon,
                    iconColor: 'red.600',
                    title: 'Server Error',
                    defaultMessage: 'Something went wrong on our end. Please try again later.',
                };
            default:
                return {
                    icon: WarningIcon,
                    iconColor: 'yellow.500',
                    title: 'Error',
                    defaultMessage: 'An unexpected error occurred while loading the project.',
                };
        }
    };

    const errorDetails = getErrorDetails();
    const displayMessage = message || errorDetails.defaultMessage;

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
                <Icon as={errorDetails.icon} boxSize={16} color={errorDetails.iconColor} />
                
                <Heading size="lg">{errorDetails.title}</Heading>
                
                <Text color={textColor} fontSize="md">
                    {displayMessage}
                </Text>

                {status && (
                    <Text fontSize="xs" color={textColor} fontFamily="mono">
                        Error Code: {status}
                    </Text>
                )}

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
                        onClick={() => window.location.reload()}
                    >
                        Try Again
                    </Button>
                </VStack>
            </VStack>
        </Box>
    );
}