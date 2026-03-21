import { useState, FormEvent } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  Stack,
  Text,
  useColorModeValue,
  Alert,
  AlertIcon,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { IT_ROLES } from '../../utils/roles';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { register, isLoading } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password || !confirmPassword) {
      setLocalError('Please fill in all required fields');
      return;
    }

    if (!role) {
      setLocalError('Please select your IT role');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    try {
      await register(email, password, name || undefined, role);
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
      >
        <Stack spacing={6}>
          <Heading
            textAlign="center"
            fontSize="3xl"
            color={useColorModeValue('gray.700', 'white')}
          >
            Create Account
          </Heading>

          {localError && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {localError}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Name (optional)</FormLabel>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Your Role</FormLabel>
                <Select
                  placeholder="Select your IT role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {IT_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </FormControl>

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
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Confirm Password</FormLabel>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                isLoading={isLoading}
                loadingText="Creating account..."
              >
                Sign Up
              </Button>
            </Stack>
          </form>

          <Text textAlign="center" fontSize="sm" color="gray.600">
            Already have an account?{' '}
            <ChakraLink
              as={RouterLink}
              to="/login"
              color="blue.500"
              fontWeight="semibold"
            >
              Sign in
            </ChakraLink>
          </Text>
        </Stack>
      </Box>
    </Container>
  );
}

export default Register;
