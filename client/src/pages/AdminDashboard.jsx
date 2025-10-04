import React, { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Archive,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  Clock,
  Shield,
  UserCheck,
  AlertTriangle,
  Search,
  RefreshCw,
  Settings,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, token } = useAuth();
  
  // User Management State
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(true);
  
  // Bins State
  const [bins, setBins] = useState([]);
  const [binsLoading, setBinsLoading] = useState(true);
  
  // UI State
  const [activeTab, setActiveTab] = useState('users');
  const [userView, setUserView] = useState('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add');
  const [editingBin, setEditingBin] = useState(null);
  const [formData, setFormData] = useState({ name: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [binSearchTerm, setBinSearchTerm] = useState(''); // NEW: Bin search state
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const [pendingRes, approvedRes, allRes] = await Promise.all([
          axiosInstance.get('/api/admin/pending-users', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axiosInstance.get('/api/admin/approved-users', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axiosInstance.get('/api/admin/all-users', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setPendingUsers(pendingRes.data);
        setApprovedUsers(approvedRes.data);
        setAllUsers(allRes.data);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setUserLoading(false);
      }
    };
    fetchUsers();
  }, [token]);

  // Fetch Bins
  useEffect(() => {
    const fetchBins = async () => {
      try {
        const response = await axiosInstance.get('/api/metadata/bins', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setBins(response.data);
      } catch (err) {
        console.error('Error fetching bins:', err);
        if (err.response?.status === 404) {
          console.log('Bins routes not found. Make sure you added bins routes to server.js');
        }
      } finally {
        setBinsLoading(false);
      }
    };
    fetchBins();
  }, [token]);

  // User Management Functions
  const handleUserAction = async (id, action) => {
    try {
      const response = await axiosInstance.put(`/api/admin/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh user data
      const [pendingRes, approvedRes, allRes] = await Promise.all([
        axiosInstance.get('/api/admin/pending-users', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axiosInstance.get('/api/admin/approved-users', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axiosInstance.get('/api/admin/all-users', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setPendingUsers(pendingRes.data);
      setApprovedUsers(approvedRes.data);
      setAllUsers(allRes.data);
      
      alert(response.data.message || `${action} successful`);
    } catch (err) {
      console.error(`${action} failed:`, err.response?.data || err);
      alert(err.response?.data?.message || `${action} failed`);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await axiosInstance.delete(`/api/admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh user data
      const [pendingRes, approvedRes, allRes] = await Promise.all([
        axiosInstance.get('/api/admin/pending-users', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axiosInstance.get('/api/admin/approved-users', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axiosInstance.get('/api/admin/all-users', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setPendingUsers(pendingRes.data);
      setApprovedUsers(approvedRes.data);
      setAllUsers(allRes.data);
      
      alert(response.data.message || 'User deleted successfully');
    } catch (err) {
      console.error('Delete failed:', err.response?.data || err);
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  // Bins Management Functions
  const handleAddBin = () => {
    setModalType('add');
    setFormData({ name: '' });
    setEditingBin(null);
    setIsModalOpen(true);
  };

  const handleEditBin = (bin) => {
    setModalType('edit');
    setFormData({ name: bin.name });
    setEditingBin(bin);
    setIsModalOpen(true);
  };

  const handleDeleteBin = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bin?')) return;
    
    try {
      await axiosInstance.delete(`/api/metadata/bins/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setBins(bins.filter(bin => bin._id !== id));
      console.log('Bin delete successful');
    } catch (err) {
      console.error('Bin delete failed:', err);
      alert('Failed to delete bin. It might be in use by existing inventory items.');
    }
  };

  const handleSubmitBin = async (e) => {
    e.preventDefault();
    
    try {
      if (modalType === 'add') {
        const response = await axiosInstance.post('/api/metadata/bins', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setBins([...bins, response.data]);
      } else {
        const response = await axiosInstance.put(`/api/metadata/bins/${editingBin._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setBins(bins.map(bin => 
          bin._id === editingBin._id ? response.data : bin
        ));
      }
      
      setIsModalOpen(false);
      setFormData({ name: '' });
      console.log(`Bin ${modalType} successful`);
    } catch (err) {
      console.error(`Bin ${modalType} failed:`, err);
      alert(`Failed to ${modalType} bin. Please try again.`);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ name: '' });
    setEditingBin(null);
  };

  // NEW: Filter bins based on search term
  const getFilteredBins = () => {
    if (!binSearchTerm.trim()) {
      return bins;
    }
    
    return bins.filter(bin => 
      bin.name.toLowerCase().includes(binSearchTerm.toLowerCase())
    );
  };

  // Helper functions
  const getStatusBadge = (status) => {
    const configs = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: Check },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: X }
    };
    
    const config = configs[status];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    return role === 'admin' ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        <Shield className="w-3 h-3 mr-1" />
        Admin
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <UserCheck className="w-3 h-3 mr-1" />
        User
      </span>
    );
  };

  const getCurrentUsers = () => {
    let users;
    switch (userView) {
      case 'pending': users = pendingUsers; break;
      case 'approved': users = approvedUsers; break;
      case 'all': users = allUsers; break;
      default: users = pendingUsers;
    }
    
    // Apply search filter
    if (searchTerm) {
      users = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    return users.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  if (userLoading && binsLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const filteredBins = getFilteredBins();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">Manage users and system configuration</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Users</p>
              <p className="text-2xl font-bold text-gray-900">{pendingUsers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{allUsers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {allUsers.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Archive className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bins</p>
              <p className="text-2xl font-bold text-gray-900">{bins.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>User Management</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('bins')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'bins'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Archive className="w-4 h-4" />
                <span>Bins Manager</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Users Tab Content */}
        {activeTab === 'users' && (
          <div className="p-6 space-y-6">
            {/* User View Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex space-x-2">
                <button
                  onClick={() => setUserView('pending')}
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    userView === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Pending ({pendingUsers.length})
                </button>
                <button
                  onClick={() => setUserView('all')}
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    userView === 'all'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Users className="w-4 h-4 mr-2" />
                  All Users ({allUsers.length})
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 -mt-2" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Users Table */}
            {getCurrentUsers().length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No users found' : 
                   userView === 'pending' ? 'No pending users' : 'No users found'}
                </h3>
                <p className="text-gray-500">
                  {searchTerm ? 'Try adjusting your search criteria.' :
                   userView === 'pending' ? 'All users have been processed!' : 'No users in the system yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Name</span>
                          {sortBy === 'name' && (
                            sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('email')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Email</span>
                          {sortBy === 'email' && (
                            sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('createdAt')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Joined</span>
                          {sortBy === 'createdAt' && (
                            sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getCurrentUsers().map(u => (
                      <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{u.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{u.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(u.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRoleBadge(u.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {new Date(u.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          {userView === 'pending' && (
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleUserAction(u._id, 'approve')} 
                                className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors text-xs font-medium"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Approve
                              </button>
                              <button 
                                onClick={() => handleUserAction(u._id, 'reject')} 
                                className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-colors text-xs font-medium"
                              >
                                <X className="w-3 h-3 mr-1" />
                                Reject
                              </button>
                            </div>
                          )}
                          
                          {userView === 'all' && (
                            <div className="flex space-x-2">
                              {u.status === 'pending' && (
                                <>
                                  <button 
                                    onClick={() => handleUserAction(u._id, 'approve')} 
                                    className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors text-xs font-medium"
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    Approve
                                  </button>
                                  <button 
                                    onClick={() => handleUserAction(u._id, 'reject')} 
                                    className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-colors text-xs font-medium"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Reject
                                  </button>
                                </>
                              )}
                              
                              {u.status !== 'pending' && (
                                <button 
                                  onClick={() => handleUserAction(u._id, 'toggle-status')} 
                                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors text-xs font-medium"
                                >
                                  <Settings className="w-3 h-3 mr-1" />
                                  {u.status === 'approved' ? 'Reject' : 'Approve'}
                                </button>
                              )}
                              
                              {u._id !== user.id && (
                                <button 
                                  onClick={() => handleUserAction(u._id, 'toggle-admin')} 
                                  className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors text-xs font-medium"
                                >
                                  <Shield className="w-3 h-3 mr-1" />
                                  {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                </button>
                              )}
                              
                              {u._id !== user.id && (
                                <button 
                                  onClick={() => handleDeleteUser(u._id)} 
                                  className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-colors text-xs font-medium"
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Bins Tab Content */}
        {activeTab === 'bins' && (
          <div className="p-6">
            {/* Header with search and add button */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Bin Locations</h2>
                <p className="text-gray-600 mt-1">Manage storage bin locations for inventory</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {/* Search bar for bins */}
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 -mt-2" />
                  <input
                    type="text"
                    placeholder="Search bins..."
                    value={binSearchTerm}
                    onChange={(e) => setBinSearchTerm(e.target.value)}
                    className="w-full sm:w-64 pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  {binSearchTerm && (
                    <button
                      onClick={() => setBinSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <button
                  onClick={handleAddBin}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Bin
                </button>
              </div>
            </div>

            {/* Search results info */}
            {binSearchTerm && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <p className="text-sm text-blue-800">
                  Found <span className="font-semibold">{filteredBins.length}</span> bin(s) matching "{binSearchTerm}"
                </p>
                {filteredBins.length === 0 && (
                  <button
                    onClick={() => setBinSearchTerm('')}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}

            {binsLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">Loading bins...</p>
              </div>
            ) : filteredBins.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {binSearchTerm ? 'No bins found' : 'No bins configured'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {binSearchTerm 
                    ? `No bins match "${binSearchTerm}". Try a different search term.`
                    : 'Create your first storage bin location to organize inventory'}
                </p>
                {!binSearchTerm && (
                  <button
                    onClick={handleAddBin}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Bin
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBins.map(bin => (
                  <div key={bin._id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg mr-3">
                          <Archive className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{bin.name}</h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Calendar className="w-3 h-3 mr-1" />
                            Created {new Date(bin.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditBin(bin)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                          title="Edit bin"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBin(bin._id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="Delete bin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {modalType === 'add' ? 'Add New Bin' : 'Edit Bin'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmitBin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bin Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                    placeholder="Enter bin name (e.g., A1, B2, Storage-001)"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Use a clear naming convention like A1, B2, or Storage-001
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center"
                  >
                    {modalType === 'add' ? (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Bin
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Update Bin
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;