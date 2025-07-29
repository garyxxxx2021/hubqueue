"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUsers, saveUsers } from '@/services/webdav'; // Using WebDAV for user persistence

// Define the shape of the user object and the auth context
interface User {
  username: string;
  isAdmin: boolean;
}

// Stored user includes password (for demo purposes)
// WARNING: Storing plain text passwords is a security risk.
// In a real application, use a secure hashing algorithm and a proper database.
interface StoredUser extends User {
    password_plaintext: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password_input: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, password_input: string) => Promise<{ success: boolean; message: string }>;
  isLoading: boolean;
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for the AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on initial render
  useEffect(() => {
    try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem('user');
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password_input: string): Promise<boolean> => {
    const users = await getUsers();
    const foundUser = users.find(u => u.username === username && u.password_plaintext === password_input);

    if (foundUser) {
      const userData = { username: foundUser.username, isAdmin: foundUser.isAdmin };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return true;
    }
    return false;
  };

  const register = async (username: string, password_input: string): Promise<{ success: boolean; message: string }> => {
    if (!username || !password_input) {
        return { success: false, message: "Username and password cannot be empty." };
    }
    
    setIsLoading(true);
    try {
        const users = await getUsers();

        if (users.find(u => u.username === username)) {
            return { success: false, message: "Username already exists." };
        }

        const isAdmin = users.length === 0; // First user is admin

        const newUser: StoredUser = {
            username,
            password_plaintext: password_input, // WARNING: Not secure
            isAdmin,
        };

        const updatedUsers = [...users, newUser];
        const { success, error } = await saveUsers(updatedUsers);

        if (success) {
            const userData = { username: newUser.username, isAdmin: newUser.isAdmin };
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return { success: true, message: "Registration successful!" };
        } else {
            return { success: false, message: error || "Failed to save user data." };
        }
    } catch (error: any) {
        return { success: false, message: error.message || "An unexpected error occurred." };
    } finally {
        setIsLoading(false);
    }
  };


  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = { user, login, logout, register, isLoading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
