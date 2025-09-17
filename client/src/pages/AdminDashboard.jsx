// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';

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
  const [userView, setUserView] = useState('pending'); // 'pending', 'approved', 'all'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add');
  const [editingBin, setEditingBin] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

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

  // Helper functions
  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return `${colors[status]} px-2 py-1 rounded-full text-sm`;
  };

  const getRoleBadge = (role) => {
    return role === 'admin' 
      ? 'bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm'
      : 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm';
  };

  const getCurrentUsers = () => {
    switch (userView) {
      case 'pending': return pendingUsers;
      case 'approved': return approvedUsers;
      case 'all': return allUsers;
      default: return pendingUsers;
    }
  };

  if (userLoading && binsLoading) {
    return <div className="p-4 text-lg">Loading...</div>;
  }

  return (
    <div className="p-6">
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('bins')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bins'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bins Manager
            </button>
          </nav>
        </div>
      </div>

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User View Toggle */}
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setUserView('pending')}
              className={`px-4 py-2 rounded ${
                userView === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pending ({pendingUsers.length})
            </button>
            {/* <button
              onClick={() => setUserView('approved')}
              className={`px-4 py-2 rounded ${
                userView === 'approved'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Approved ({approvedUsers.length})
            </button> */}
            <button
              onClick={() => setUserView('all')}
              className={`px-4 py-2 rounded ${
                userView === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Users ({allUsers.length})
            </button>
          </div>

          {/* Users Table */}
          <div>
            <h1 className="text-2xl font-bold mb-4">
              {userView === 'pending' && 'Pending Users'}
              {userView === 'approved' && 'Approved Users'}
              {userView === 'all' && 'All Users'}
            </h1>
            
            {getCurrentUsers().length === 0 ? (
              <p className="text-gray-600">
                {userView === 'pending' ? 'No pending users 🎉' : 
                 userView === 'approved' ? 'No approved users yet.' :
                 'No users found.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 rounded-lg">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Role</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCurrentUsers().map(u => (
                      <tr key={u._id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{u.name}</td>
                        <td className="px-4 py-2">{u.email}</td>
                        <td className="px-4 py-2">
                          <span className={getStatusBadge(u.status)}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={getRoleBadge(u.role)}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-2 space-x-2">
                          {userView === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleUserAction(u._id, 'approve')} 
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors text-sm"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleUserAction(u._id, 'reject')} 
                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded transition-colors text-sm"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          
                          {userView === 'all' && (
                            <>
                              <button 
                                onClick={() => handleUserAction(u._id, 'toggle-status')} 
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors text-sm"
                              >
                                Change Status
                              </button>
                              
                              {u._id !== user.id && (
                                <button 
                                  onClick={() => handleUserAction(u._id, 'toggle-admin')} 
                                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded transition-colors text-sm"
                                >
                                  {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                </button>
                              )}
                            </>
                          )}
                          
                          {u._id !== user.id && (
                            <button 
                              onClick={() => handleDeleteUser(u._id)} 
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors text-sm"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bins Tab Content */}
      {activeTab === 'bins' && (
        <div>
          {/* Bins Content */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Bins Management</h2>
              <button
                onClick={handleAddBin}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
              >
                Add Bin
              </button>
            </div>

            {binsLoading ? (
              <p className="text-gray-600">Loading...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bins.map(bin => (
                  <div key={bin._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{bin.name}</h3>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(bin.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditBin(bin)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBin(bin._id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {bins.length === 0 && !binsLoading && (
              <p className="text-gray-600 text-center py-8">
                No bins found. Add your first bin!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {modalType === 'add' ? 'Add' : 'Edit'} Bin
            </h3>
            
            <form onSubmit={handleSubmitBin}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bin Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="Enter bin name (e.g., A1, B2, Storage-001)"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  {modalType === 'add' ? 'Add' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;