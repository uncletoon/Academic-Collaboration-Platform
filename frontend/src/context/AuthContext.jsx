import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.getProfile();
          setUser(res.user);
        } catch (err) {
          console.error('Failed to load profile on mount', err);
          logout();
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await api.login({ email, password });
      localStorage.setItem('token', res.token);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const res = await api.register(userData);
      if (res.token) {
        localStorage.setItem('token', res.token);
        setUser(res.user);
      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
      return res;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.getProfile();
      setUser(res.user);
    } catch (err) {
      console.error('Error refreshing user details', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, error, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
