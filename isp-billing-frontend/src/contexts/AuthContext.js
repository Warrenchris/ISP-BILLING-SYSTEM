import React, { createContext, useContext, useState, useEffect } from 'react';
// import api from '../services/api';
import { authService } from '../services/authService';

import { useNotification } from './NotificationContext';

const AuthContext = createContext();

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
  const { notifySuccess, notifyError, notifyInfo } = useNotification();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          // Verify token validity optionally here
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.clear();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login({ email, password });
      const { accessToken: token, refreshToken } = response.data.data.tokens;
      const userData = response.data.data.user;

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      notifySuccess(`Welcome back, ${userData.name || 'User'}!`);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      notifyError(message);
      return {
        success: false,
        message
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      notifySuccess('Registration successful! Please login.');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Registration error:', error);
      const message = error.response?.data?.message || 'Registration failed';
      notifyError(message);
      return {
        success: false,
        message
      };
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    notifyInfo('You have been logged out.');
    window.location.href = '/login';
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData);
      const updatedUser = response.data.data.user;

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      notifySuccess('Profile updated successfully!');
      return { success: true, data: updatedUser };
    } catch (error) {
      console.error('Profile update error:', error);
      const message = error.response?.data?.message || 'Profile update failed';
      notifyError(message);
      return {
        success: false,
        message
      };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await authService.changePassword({ currentPassword, newPassword });
      notifySuccess('Password changed successfully!');
      return { success: true };
    } catch (error) {
      console.error('Password change error:', error);
      const message = error.response?.data?.message || 'Password change failed';
      notifyError(message);
      return {
        success: false,
        message
      };
    }
  };

  const isAuthenticated = () => {
    return !!user && !!localStorage.getItem('token');
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isSupport = () => {
    return user?.role === 'support' || user?.role === 'admin';
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated,
    isAdmin,
    isSupport,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
