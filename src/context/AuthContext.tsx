import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: 'super_admin' | 'admin' | 'employee';
  departmentId: string | null;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  onboardingRequired: boolean;
  loginEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  loginOTP: (email: string, code: string) => Promise<{ success: boolean; onboardingRequired?: boolean; error?: string }>;
  completeOnboarding: (fullName: string, departmentId: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [onboardingRequired, setOnboardingRequired] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Auto-refresh token on startup
  useEffect(() => {
    const initAuth = async () => {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (storedRefreshToken) {
        try {
          const res = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
          });
          
          if (res.ok) {
            const data = await res.json();
            setAccessToken(data.accessToken);
            setUser(data.user);
            if (!data.user.fullName || !data.user.departmentId) {
              setOnboardingRequired(true);
            }
          } else {
            // Token expired/revoked
            localStorage.removeItem('refreshToken');
          }
        } catch (err) {
          console.error('Failed to initialize auth:', err);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // 1. Send OTP Request
  const loginEmail = async (email: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to send OTP' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Server connection error' };
    }
  };

  // 2. Verify OTP
  const loginOTP = async (email: string, code: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid OTP code' };
      }

      // Save tokens
      localStorage.setItem('refreshToken', data.refreshToken);
      setAccessToken(data.accessToken);
      setUser(data.user);
      setOnboardingRequired(data.onboardingRequired);

      return { success: true, onboardingRequired: data.onboardingRequired };
    } catch (err: any) {
      return { success: false, error: err.message || 'Server connection error' };
    }
  };

  // 3. First Login Onboarding
  const completeOnboarding = async (fullName: string, departmentId: string) => {
    if (!user) return { success: false, error: 'No user authenticated' };

    try {
      const res = await fetch(`${API_URL}/auth/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId: user.id, fullName, departmentId }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Onboarding failed' };
      }

      // Update user state
      setUser(data.user);
      setOnboardingRequired(false);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Server connection error' };
    }
  };

  // 4. Logout
  const logout = async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (storedRefreshToken) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });
      } catch (err) {
        console.error('Logout request failed:', err);
      }
    }

    // Clear client tokens
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setUser(null);
    setOnboardingRequired(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        onboardingRequired,
        loginEmail,
        loginOTP,
        completeOnboarding,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthContext;
