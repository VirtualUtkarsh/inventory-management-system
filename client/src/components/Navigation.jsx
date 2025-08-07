import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) =>
    location.pathname === path
      ? 'bg-blue-600 text-white'
      : 'text-gray-700 hover:bg-gray-100';

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-center space-x-1">
          <Link
            to="/inventory"
            className={`px-4 py-2 rounded-md transition-colors duration-200 ${isActive('/inventory')}`}
          >
            Inventory
          </Link>
          <Link
            to="/outsets"
            className={`px-4 py-2 rounded-md transition-colors duration-200 ${isActive('/outsets')}`}
          >
            Outset
          </Link>
          <Link
            to="/insets"
            className={`px-4 py-2 rounded-md transition-colors duration-200 ${isActive('/insets')}`}
          >
            Inset
          </Link>
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`px-4 py-2 rounded-md transition-colors duration-200 ${isActive('/admin')}`}
            >
              Admin Dashboard
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
