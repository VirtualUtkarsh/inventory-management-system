import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import jwt_decode from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true); // 👈 added loading
  const navigate = useNavigate();

  axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

  const register = async (name, email, password) => {
    try {
      const { data } = await axios.post('/api/auth/register', { name, email, password });
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      navigate('/inventory');
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
        setLoading(false); // 👈 release if no token
        return;
      }

      try {
        const decoded = jwt_decode(token);
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          if (!user) {
            const res = await axios.get('/api/auth/me');
            setUser(res.data.user);
          }
        }
      } catch (error) {
        console.error('Token decode or /me fetch error:', error);
        logout();
      } finally {
        setLoading(false); // 👈 release after done
      }
    };

    initializeAuth();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
