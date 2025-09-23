import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axiosInstance from '../utils/axiosInstance';
import jwt_decode from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Memoize logout function to prevent unnecessary re-renders
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login with axiosInstance...');
      const { data } = await axiosInstance.post('/api/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      
      // Navigate based on user role
      if (data.user?.role === 'admin') {
        console.log('🔍 Navigating admin to /admin');
        navigate('/admin');
      } else {
        console.log('🔍 Navigating regular user to /inventory');
        navigate('/inventory');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error.response?.data || error.message;
    }
  };

  const register = async (name, email, password) => {
    try {
      console.log('📝 Attempting register with axiosInstance...');
      const { data } = await axiosInstance.post('/api/auth/register', { name, email, password });
      
      // Note: After registration, users are pending approval
      // Don't set token/user or navigate - show success message instead
      return {
        success: true,
        message: data.message || 'Registration successful. Awaiting admin approval.'
      };
    } catch (error) {
      console.error('Register error:', error);
      throw error.response?.data || error.message;
    }
  };

  // Check if user is admin
  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  // Check if user is approved
  const isApproved = () => {
    return user && user.status === 'approved';
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const decoded = jwt_decode(token);
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          // Always try to fetch user data if we don't have it
          if (!user) {
            console.log('🔍 Fetching user from /api/auth/me');
            try {
              const res = await axiosInstance.get('/api/auth/me');
              console.log('🔍 /api/auth/me response:', res.data);
              setUser(res.data.user);
            } catch (error) {
              console.error('🔍 /api/auth/me failed:', error);
              // If /me route fails, logout to be safe
              logout();
            }
          }
        }
      } catch (error) {
        console.error('Token decode or /me fetch error:', error);
        logout();
      } finally {
        console.log('🔍 Setting loading to false');
        setLoading(false);
      }
    };

    initializeAuth();
  }, [token, user, logout]); // Now includes logout in dependencies

  // DEBUG: Log current state
  console.log('🔍 AuthContext state:', { user: user?.role, token: !!token, loading });

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      isAdmin,
      isApproved
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);