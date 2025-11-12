import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, User } from '../api/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');

      if (storedUser && token) {
        try {
          // Verify token is still valid
          const response = await authAPI.me();
          // Normalize the user shape: backend may return a populated user with `_id`.
          const respUser = response.data.user as unknown;
          const userObj = (respUser && typeof respUser === 'object') ? (respUser as Record<string, unknown>) : {};
          const normalized = {
            id: String(userObj['id'] || userObj['_id'] || ''),
            email: String(userObj['email'] || ''),
            name: String(userObj['name'] || ''),
          };
          // Keep localStorage in sync with normalized shape
          localStorage.setItem('user', JSON.stringify(normalized));
          setUser(normalized);
        } catch (err) {
          // Token invalid, clear storage
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authAPI.login(email, password);
      const respUser = response.data.user as unknown;
      const ru = (respUser && typeof respUser === 'object') ? (respUser as Record<string, unknown>) : {};
      const normalizedUser = { id: String(ru['id'] || ru['_id'] || ''), email: String(ru['email'] || ''), name: String(ru['name'] || '') };

      const accessToken = response.data.accessToken as string;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);

      navigate('/projects');
    } catch (err: unknown) {
      // err is unknown in strict TS; try to extract message safely
      let message = 'Login failed';
      if (err && typeof err === 'object' && 'response' in err) {
        const maybe = (err as Record<string, unknown>).response as Record<string, unknown> | undefined;
        if (maybe && 'data' in maybe) {
          const d = maybe.data as Record<string, unknown> | undefined;
          if (d && typeof d.error === 'string') message = d.error;
        }
      }
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authAPI.register(email, password, name);
      const respUser = response.data.user as unknown;
      const ru = (respUser && typeof respUser === 'object') ? (respUser as Record<string, unknown>) : {};
      const normalizedUser = { id: String(ru['id'] || ru['_id'] || ''), email: String(ru['email'] || ''), name: String(ru['name'] || '') };
      const accessToken = response.data.accessToken as string;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);

      navigate('/projects');
    } catch (err: unknown) {
      let message = 'Registration failed';
      if (err && typeof err === 'object' && 'response' in err) {
        const maybe = (err as Record<string, unknown>).response as Record<string, unknown> | undefined;
        if (maybe && 'data' in maybe) {
          const d = maybe.data as Record<string, unknown> | undefined;
          if (d && typeof d.error === 'string') message = d.error;
        }
      }
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
