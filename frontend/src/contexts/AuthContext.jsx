import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/auth.service';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Check authentication status on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const result = await authService.getCurrentUser();
          if (result.success) {
            setUser(result.user);
          } else {
            authService.logout();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const register = useCallback(async (email, username, password) => {
    try {
      setError(null);
      setLoading(true);
      
      const validationErrors = [];
      
      if (!authService.validateEmail(email)) {
        validationErrors.push('Please enter a valid email address');
      }
      
      if (!authService.validateUsername(username)) {
        validationErrors.push('Username must be 3-20 characters and contain only letters, numbers, and underscores');
      }
      
      const passwordErrors = authService.validatePassword(password);
      validationErrors.push(...passwordErrors);
      
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('. '));
      }
      
      const result = await authService.register(email, username, password);
      
      if (result.success) {
        setUser(result.user);
        navigate('/home');
        return { success: true };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const login = useCallback(async (username, password) => {
    try {
      setError(null);
      setLoading(true);
      
      if (!username || !password) {
        throw new Error('Username and password are required');
      }
      
      const result = await authService.login(username, password);
      
      if (result.success) {
        setUser(result.user);
        navigate('/home');
        return { success: true };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [navigate]);

  const addToUserHistory = useCallback(async (meetingCode) => {
    try {
      const response = await fetch('/api/v1/auth/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        },
        body: JSON.stringify({ meetingCode })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add to history');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error adding to history:', error);
      throw error;
    }
  }, []);

  const getHistoryOfUser = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/auth/history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching history:', error);
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    addToUserHistory,
    getHistoryOfUser,
    clearError,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
