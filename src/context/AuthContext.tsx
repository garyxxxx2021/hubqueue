
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { getUsers, saveUsers, StoredUser } from '@/services/webdav'; 

interface User {
  username: string;
  isAdmin: boolean;
  isTrusted: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password_input: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, password_input: string) => Promise<{ success: boolean; message: string }>;
  isLoading: boolean;
  updateUserStatus: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const USER_COOKIE_KEY = 'hubqueue_user';

interface AuthProviderProps {
  children: ReactNode;
}

async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserByUsername = async (username: string) => {
    try {
      const users = await getUsers();
      const foundUser = users.find(u => u.username === username);
      if (foundUser) {
        const userData = { 
          username: foundUser.username, 
          isAdmin: foundUser.isAdmin, 
          isTrusted: foundUser.isAdmin || foundUser.isTrusted 
        };
        setUser(userData);
      } else {
        // User in cookie not found in DB, treat as logged out
        logout();
      }
    } catch (error) {
      console.error("Failed to fetch user data", error);
      logout(); // Log out on error
    }
  };

  useEffect(() => {
    const loadUserFromCookie = async () => {
      setIsLoading(true);
      try {
          const storedUsername = Cookies.get(USER_COOKIE_KEY);
          if (storedUsername) {
              await fetchUserByUsername(storedUsername);
          }
      } catch (error) {
          console.error("Failed to process user from cookie", error);
          logout();
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromCookie();
  }, []);

  const updateUserStatus = async (username: string) => {
    if (user && user.username === username) {
      setIsLoading(true);
      await fetchUserByUsername(username);
      setIsLoading(false);
    }
  };
  
  const login = async (username: string, password_input: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const users = await getUsers();
      const passwordHash = await hashPassword(password_input);
      const foundUser = users.find(u => u.username === username && u.passwordHash === passwordHash);

      if (foundUser) {
        const userData = { 
          username: foundUser.username, 
          isAdmin: foundUser.isAdmin, 
          isTrusted: foundUser.isAdmin || foundUser.isTrusted 
        };
        Cookies.set(USER_COOKIE_KEY, foundUser.username, { expires: 7 }); 
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password_input: string): Promise<{ success: boolean; message: string }> => {
    if (!username || !password_input) {
        return { success: false, message: "用户名和密码不能为空。" };
    }
    
    setIsLoading(true);
    try {
        const users = await getUsers();

        if (users.find(u => u.username === username)) {
            return { success: false, message: "该用户名已存在。" };
        }

        const isAdmin = users.length === 0;
        const isTrusted = isAdmin; // First user is admin and trusted
        const passwordHash = await hashPassword(password_input);

        const newUser: StoredUser = {
            username,
            passwordHash,
            isAdmin,
            isTrusted,
        };

        const updatedUsers = [...users, newUser];
        const { success, error } = await saveUsers(updatedUsers);

        if (success) {
            const userData = { username: newUser.username, isAdmin: newUser.isAdmin, isTrusted: newUser.isTrusted };
            Cookies.set(USER_COOKIE_KEY, newUser.username, { expires: 7 });
            setUser(userData);
            return { success: true, message: "注册成功！" };
        } else {
            return { success: false, message: error || "无法保存用户数据。" };
        }
    } catch (error: any) {
        return { success: false, message: error.message || "发生未知错误。" };
    } finally {
        setIsLoading(false);
    }
  };


  const logout = () => {
    Cookies.remove(USER_COOKIE_KEY);
    setUser(null);
  };

  const value = { user, login, logout, register, isLoading, updateUserStatus };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 中使用');
  }
  return context;
}
