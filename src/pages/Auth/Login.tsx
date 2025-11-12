import { useState, FormEvent } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useColorModeValue,
  Alert,
  AlertIcon,
  Link as ChakraLink,
} from '@chakra-ui/react';
import DarkModeIconButton from '../../components/DarkModeIconButton/DarkModeIconButton';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setLocalError(message);
    }
  };

  return (
    <Container maxW="md" py={12}>
      <Box
        bg={useColorModeValue('white', 'gray.800')}
        p={8}
        borderRadius="xl"
        boxShadow="xl"
        position="relative"
      >
        <Stack spacing={6}>
          {/* Dark mode toggle in the top-right of the card */}
          <Box position="absolute" top={3} right={3}>
            <DarkModeIconButton size="sm" />
          </Box>
          <Heading
            textAlign="center"
            fontSize="3xl"
            color={useColorModeValue('gray.700', 'white')}
          >
            Welcome Back
          </Heading>

          {localError && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {localError}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                isLoading={isLoading}
                loadingText="Signing in..."
              >
                Sign In
              </Button>
            </Stack>
          </form>

          <Text textAlign="center" fontSize="sm" color="gray.600">
            Don&apos;t have an account?{' '}
            <ChakraLink as={RouterLink} to="/register" color="blue.500" fontWeight="semibold">
              Create one
            </ChakraLink>
          </Text>

        </Stack>
      </Box>
    </Container>
  );
}

export default Login;
