"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string) => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  const signIn = async (email: string): Promise<boolean> => {
    try {
      // For demo purposes, we'll use a simple email-based auth
      // In production, you'd integrate with your actual auth system
      const userData = await fetchUserRole(email);
      
      if (userData) {
        setUser(userData);
        localStorage.setItem('currentUserEmail', email);
        return true;
      } else {
        alert('User not found or no access granted');
        return false;
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return false;
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('currentUserEmail');
  };

  useEffect(() => {
    // Check for existing session
    const savedEmail = localStorage.getItem('currentUserEmail');
    if (savedEmail) {
      fetchUserRole(savedEmail).then((userData) => {
        if (userData) {
          setUser(userData);
        } else {
          localStorage.removeItem('currentUserEmail');
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isAdmin: user?.role === 'admin',
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};