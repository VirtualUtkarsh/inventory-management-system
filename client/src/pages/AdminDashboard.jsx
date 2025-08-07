// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch both pending and approved users
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
        setLoading(false);
      }
    };
    fetchUsers();
  }, [token]);

  const handlePendingAction = async (id, action) => {
    try {
      const method = 'put';
      const url = `/api/admin/${id}/${action}`;

      await axiosInstance({
        method,
        url,
        headers: { Authorization: `Bearer ${token}` },
      });

      // Remove from pending list
      setPendingUsers(prevUsers => prevUsers.filter(user => user._id !== id));
      
      // If approved, add to approved list
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

      // Remove from approved list
      setApprovedUsers(prevUsers => prevUsers.filter(user => user._id !== id));
      
      console.log(`Delete successful for user ${id}`);
    } catch (err) {
      console.error(`Delete failed:`, err.response?.data || err);
    }
  };

  if (loading) return <div className="p-4 text-lg">Loading...</div>;

  return (
    <div className="p-6 space-y-8">
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
  );
};

export default AdminDashboard;