// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { user, token } = useAuth();
  
  // User Management State
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(true);
  
  // Metadata State
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [packs, setPacks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [metadataLoading, setMetadataLoading] = useState(true);
  
  // UI State
  const [activeTab, setActiveTab] = useState('users');
  const [activeMetadataTab, setActiveMetadataTab] = useState('sizes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  // Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const [pendingRes, approvedRes] = await Promise.all([
          axiosInstance.get('/api/admin/pending-users', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axiosInstance.get('/api/admin/approved-users', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setPendingUsers(pendingRes.data);
        setApprovedUsers(approvedRes.data);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setUserLoading(false);
      }
    };
    fetchUsers();
  }, [token]);

  // Fetch Metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [sizesRes, colorsRes, packsRes, categoriesRes] = await Promise.all([
          axiosInstance.get('/api/metadata/sizes', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axiosInstance.get('/api/metadata/colors', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axiosInstance.get('/api/metadata/packs', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axiosInstance.get('/api/metadata/categories', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setSizes(sizesRes.data);
        setColors(colorsRes.data);
        setPacks(packsRes.data);
        setCategories(categoriesRes.data);
      } catch (err) {
        console.error('Error fetching metadata:', err);
        // If metadata routes not found, show helpful message
        if (err.response?.status === 404) {
          console.log('Metadata routes not found. Make sure you added metadata routes to server.js');
        }
      } finally {
        setMetadataLoading(false);
      }
    };
    fetchMetadata();
  }, [token]);

  // User Management Functions
  const handlePendingAction = async (id, action) => {
    try {
      const method = 'put';
      const url = `/api/admin/${id}/${action}`;

      await axiosInstance({
        method,
        url,
        headers: { Authorization: `Bearer ${token}` },
      });

      setPendingUsers(prevUsers => prevUsers.filter(user => user._id !== id));
      
      if (action === 'approve') {
        const approvedUser = pendingUsers.find(user => user._id === id);
        if (approvedUser) {
          setApprovedUsers(prevUsers => [...prevUsers, { ...approvedUser, status: 'approved' }]);
        }
      }
      
      console.log(`${action} successful for user ${id}`);
    } catch (err) {
      console.error(`${action} failed:`, err.response?.data || err);
    }
  };

  const handleDeleteApproved = async (id) => {
    try {
      await axiosInstance.delete(`/api/admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setApprovedUsers(prevUsers => prevUsers.filter(user => user._id !== id));
      console.log(`Delete successful for user ${id}`);
    } catch (err) {
      console.error(`Delete failed:`, err.response?.data || err);
    }
  };

  // Metadata Management Functions
  const getCurrentMetadata = () => {
    switch (activeMetadataTab) {
      case 'sizes': return sizes;
      case 'colors': return colors;
      case 'packs': return packs;
      case 'categories': return categories;
      default: return [];
    }
  };

  const setCurrentMetadata = (data) => {
    switch (activeMetadataTab) {
      case 'sizes': setSizes(data); break;
      case 'colors': setColors(data); break;
      case 'packs': setPacks(data); break;
      case 'categories': setCategories(data); break;
    }
  };

  const handleAddMetadata = () => {
    setModalType('add');
    setFormData({ name: '' });
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEditMetadata = (item) => {
    setModalType('edit');
    setFormData({ name: item.name });
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDeleteMetadata = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await axiosInstance.delete(`/api/metadata/${activeMetadataTab}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const currentData = getCurrentMetadata();
      setCurrentMetadata(currentData.filter(item => item._id !== id));
      console.log('Delete successful');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleSubmitMetadata = async (e) => {
    e.preventDefault();
    
    try {
      if (modalType === 'add') {
        const response = await axiosInstance.post(`/api/metadata/${activeMetadataTab}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const currentData = getCurrentMetadata();
        setCurrentMetadata([...currentData, response.data]);
      } else {
        const response = await axiosInstance.put(`/api/metadata/${activeMetadataTab}/${editingItem._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const currentData = getCurrentMetadata();
        setCurrentMetadata(currentData.map(item => 
          item._id === editingItem._id ? response.data : item
        ));
      }
      
      setIsModalOpen(false);
      setFormData({ name: '' });
      console.log(`${modalType} successful`);
    } catch (err) {
      console.error(`${modalType} failed:`, err);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ name: '' });
    setEditingItem(null);
  };

  if (userLoading && metadataLoading) {
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
              onClick={() => setActiveTab('metadata')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'metadata'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Metadata Manager
            </button>
          </nav>
        </div>
      </div>

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <div className="space-y-8">
          {/* Pending Users Section */}
          <div>
            <h1 className="text-2xl font-bold mb-4">Pending Users</h1>
            {pendingUsers.length === 0 ? (
              <p className="text-gray-600">No pending users 🎉</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 rounded-lg">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map(u => (
                      <tr key={u._id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{u.name}</td>
                        <td className="px-4 py-2">{u.email}</td>
                        <td className="px-4 py-2 space-x-2">
                          <button 
                            onClick={() => handlePendingAction(u._id, 'approve')} 
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handlePendingAction(u._id, 'reject')} 
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded transition-colors"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Approved Users Section */}
          <div>
            <h1 className="text-2xl font-bold mb-4">Users</h1>
            {approvedUsers.length === 0 ? (
              <p className="text-gray-600">No approved users yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 rounded-lg">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedUsers.map(u => (
                      <tr key={u._id} className="border-t hover:bg-blue-50">
                        <td className="px-4 py-2">{u.name}</td>
                        <td className="px-4 py-2">{u.email}</td>
                        <td className="px-4 py-2">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                            Approved
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <button 
                            onClick={() => handleDeleteApproved(u._id)} 
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                          >
                            Delete
                          </button>
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

      {/* Metadata Tab Content */}
      {activeTab === 'metadata' && (
        <div>
          {/* Metadata Sub-tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {['sizes', 'colors', 'packs', 'categories'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveMetadataTab(tab)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                      activeMetadataTab === tab
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Metadata Content */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold capitalize">{activeMetadataTab} Management</h2>
              <button
                onClick={handleAddMetadata}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
              >
                Add {activeMetadataTab.slice(0, -1)}
              </button>
            </div>

            {metadataLoading ? (
              <p className="text-gray-600">Loading...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getCurrentMetadata().map(item => (
                  <div key={item._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditMetadata(item)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMetadata(item._id)}
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

            {getCurrentMetadata().length === 0 && !metadataLoading && (
              <p className="text-gray-600 text-center py-8">
                No {activeMetadataTab} found. Add your first {activeMetadataTab.slice(0, -1)}!
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
              {modalType === 'add' ? 'Add' : 'Edit'} {activeMetadataTab.slice(0, -1)}
            </h3>
            
            <form onSubmit={handleSubmitMetadata}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder={`Enter ${activeMetadataTab.slice(0, -1)} name`}
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