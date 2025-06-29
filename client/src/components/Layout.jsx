import { useAuth } from '../context/AuthContext';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import './Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="container flex justify-between items-center py-4">
          <h1 className="text-2xl font-bold">Vero Lie Inventory</h1>
          <div className="user-info flex items-center gap-4">
            <span className="text-gray-700">Welcome, {user?.name || 'User'}</span>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <nav className="app-nav bg-gray-200">
        <div className="container py-2">
          <ul className="flex gap-6">
            <li>
              <Link to="/inventory">Inventory</Link>
            </li>
            <li>
              <Link to="/insets">Inbound Items</Link>
            </li>
            <li>
              <Link to="/outsets">Outbound Items</Link>
            </li>
          </ul>
        </div>
      </nav>

      <main className="app-main py-6">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
