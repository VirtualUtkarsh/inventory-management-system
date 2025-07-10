import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import jwt_decode from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const navigate = useNavigate();

  // Set the base URL for axios (no trailing slash)
  axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Login function
  const login = async (email, password) => {
    try {
      const { data } = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      navigate('/inventory');
    } catch (error) {
      console.error('Login error:', error);
      throw error.response?.data || error.message;
    }
  };

  // Register function
  const register = async (name, email, password) => {
    try {
      console.log('AuthContext register called with:', { name, email });
      const { data } = await axios.post('/api/auth/register', { name, email, password });
      console.log('AuthContext register successful:', data);
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      navigate('/inventory');
    } catch (error) {
      console.error('Register error:', error);
      throw error.response?.data || error.message;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  // Effect to decode token and set user
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwt_decode(token);
        if (decoded.exp * 1000 < Date.now()) {
          logout(); // Token expired
        } else {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setUser(decoded);
        }
      } catch (error) {
        console.error('Token decode error:', error);
        logout();
      }
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
