import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Package, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User,
  ChevronDown
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  console.log("User context:", user);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigationItems = [
    {
      name: 'Inventory',
      href: '/inventory',
      icon: Package,
      description: 'View and manage inventory'
    },
    {
      name: 'Inbound Items',
      href: '/insets',
      icon: ArrowDownToLine,
      description: 'Manage incoming stock'
    },
    {
      name: 'Outbound Items', 
      href: '/outsets',
      icon: ArrowUpFromLine,
      description: 'Track outgoing stock'
    }
  ];

  // Add admin dashboard for admin users
  if (user?.role === 'admin') {
    navigationItems.push({
      name: 'Admin Dashboard',
      href: '/admin',
      icon: Settings,
      description: 'Administrative controls'
    });
  }

  const isCurrentPage = (href) => {
    if (href === '/inventory' && (location.pathname === '/' || location.pathname === '/inventory')) {
      return true;
    }
    return location.pathname === href;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Inventory Management
                </h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const current = isCurrentPage(item.href);
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      current
                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`mr-2 h-4 w-4 ${current ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Desktop User Menu */}
              <div className="hidden md:block relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center text-sm rounded-full bg-white p-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{user?.name || 'User'}</div>
                      <div className="text-xs text-gray-500 capitalize">
                        {user?.role === 'admin' ? 'Administrator' : 'General User'}
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </div>
                </button>

                {/* User Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm text-gray-900 font-medium">{user?.name || 'User'}</p>
                        <p className="text-sm text-gray-500">{user?.email || 'No email'}</p>
                        <p className="text-xs text-gray-400 mt-1 capitalize">
                          {user?.role === 'admin' ? 'Administrator' : 'General User'} Account
                        </p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-3 text-gray-500" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 pt-2 pb-3 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const current = isCurrentPage(item.href);
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center px-3 py-3 text-base font-medium rounded-lg transition-all duration-200 ${
                      current
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${current ? 'text-blue-600' : 'text-gray-500'}`} />
                    <div>
                      <div>{item.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
            
            {/* Mobile User Section */}
            <div className="border-t border-gray-200 pt-4 pb-3">
              <div className="px-4 flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-base font-medium text-gray-800">{user?.name || 'User'}</div>
                  <div className="text-sm text-gray-500 capitalize">
                    {user?.role === 'admin' ? 'Administrator' : 'General User'}
                  </div>
                </div>
              </div>
              <div className="px-4">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg flex items-center transition-colors"
                >
                  <LogOut className="w-5 h-5 mr-3 text-gray-500" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Click outside handler for dropdowns */}
      {(isUserMenuOpen || isMobileMenuOpen) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsUserMenuOpen(false);
            setIsMobileMenuOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Layout;