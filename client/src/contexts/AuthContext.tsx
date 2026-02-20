import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/authApi';
import type { User } from '../types/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      // Token is invalid, clear it
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  }

  async function login(login: string, password: string) {
    const response = await authAPI.login(login, password);
    const { user, accessToken, refreshToken } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
  }

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    window.location.pathname = '/journey/login';
  }

  function updateUser(updatedUser: User) {
    setUser(updatedUser);
  }

  async function refreshUser() {
    try {
      const response = await authAPI.getCurrentUser();
      const newUser = response.data.user;
      
      // Only update if user data actually changed (avoid unnecessary rerenders)
      setUser(prevUser => {
        if (!prevUser || 
            prevUser.id !== newUser.id || 
            prevUser.username !== newUser.username || 
            prevUser.email !== newUser.email ||
            prevUser.role !== newUser.role) {
          return newUser;
        }
        return prevUser; // Return same reference if nothing changed
      });
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
