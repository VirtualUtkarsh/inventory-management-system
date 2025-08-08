import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import jwt_decode from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const login = async (email, password) => {
    try {
      const { data } = await axios.post('/api/auth/login', { email, password });
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
      const { data } = await axios.post('/api/auth/register', { name, email, password });
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      
      // Navigate based on user role
      if (data.user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/inventory');
      }
    } catch (error) {
      console.error('Register error:', error);
      throw error.response?.data || error.message;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login');
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
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Always try to fetch user data if we don't have it
          if (!user) {
            console.log('🔍 Fetching user from /api/auth/me');
            try {
              const res = await axios.get('/api/auth/me');
              console.log('🔍 /api/auth/me response:', res.data);
              setUser(res.data.user);
            } catch (error) {
              console.error('🔍 /api/auth/me failed:', error);
              // If /me route fails, try to decode user from token
              // This is a fallback, but won't have role info
              console.log('🔍 Falling back to token-only auth');
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
  }, [token, user]); // Added user to dependency array

  // DEBUG: Log current state
  console.log('🔍 AuthContext state:', { user: user?.role, token: !!token, loading });

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);