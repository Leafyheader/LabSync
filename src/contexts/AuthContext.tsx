import React, { createContext, useState, useEffect } from 'react';
import { AuthState } from '../types';
import { api, getAuthToken } from '../services/api';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth token and validate
    const initializeAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const { user } = await api.auth.getCurrentUser();
          setAuthState({
            user,
            isAuthenticated: true
          });
        } catch (error) {
          console.error('Auth initialization failed:', error);
          // Clear invalid token
          api.auth.logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { user } = await api.auth.login({ username, password });
      setAuthState({
        user,
        isAuthenticated: true
      });
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.auth.logout();
    setAuthState({
      user: null,
      isAuthenticated: false
    });
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};