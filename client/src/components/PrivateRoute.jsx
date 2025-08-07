import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ adminOnly = false, children }) => {
  const { token, user, loading } = useAuth();

  if (loading) return <div>Loading...</div>; // Wait until we know

  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/" replace />;

  return children;
};

export default PrivateRoute;
