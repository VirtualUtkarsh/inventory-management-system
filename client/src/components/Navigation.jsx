import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navigation = () => {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const isActive = (path) =>
    location.pathname === path
      ? 'bg-blue-600 text-white'
      : 'text-gray-700 hover:bg-gray-100';

  const handleLogout = () => {
    logout();
  };

  // Don't show navigation if no user
  if (!user) return null;

  return (
    <nav className="bg-white shadow-md border-b">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-800">
              Inventory System
            </h1>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
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
            
            {/* Admin-only link */}
            {isAdmin() && (
              <Link
                to="/admin"
                className={`px-4 py-2 rounded-md transition-colors duration-200 bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium ${
                  location.pathname === '/admin' ? 'bg-purple-600 text-white' : ''
                }`}
              >
                Admin Panel
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span>Welcome, </span>
              <span className="font-medium text-gray-800">{user.name}</span>
              {isAdmin() && (
                <span className="ml-2 px-2 py-1 bg-purple-600 text-white rounded-full text-xs">
                  Admin
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors duration-200 text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;