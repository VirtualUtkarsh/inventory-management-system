import React, { useState, useEffect } from 'react';
import axios from 'axios';

const InsetPage = () => {
  const [formData, setFormData] = useState({
    sku: '',
    orderNo: '',
    bin: '',
    quantity: '',
    name: ''
  });

  const [insets, setInsets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  const fetchInsets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('http://localhost:5000/api/insets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInsets(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsets();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 🔍 Debug line to inspect the form data
    console.log('Submitting:', JSON.stringify(formData, null, 2));

    try {
      await axios.post('http://localhost:5000/api/insets', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormData({ sku: '', orderNo: '', bin: '', quantity: '', name: '' });
      setShowForm(false);
      await fetchInsets();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
      console.error('Submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Inbound (Inset) Management</h2>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Add New Inbound
              </button>
            )}
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
                  <input
                    type="text"
                    name="orderNo"
                    value={formData.orderNo}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bin Location</label>
                  <input
                    type="text"
                    name="bin"
                    value={formData.bin}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:bg-green-400"
                >
                  {loading ? 'Saving...' : 'Save Inbound'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
              </div>
              {error && <p className="text-red-500 mt-2">{error}</p>}
            </form>
          )}

          <div className="overflow-x-auto mt-6">
            <h3 className="text-xl font-semibold mb-4">Inbound History</h3>
            {loading && insets.length === 0 ? (
              <p>Loading data...</p>
            ) : insets.length === 0 ? (
              <p className="text-gray-500">No inbound records found</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {insets.map((inset) => (
                    <tr key={inset._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inset.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inset.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inset.orderNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inset.bin}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inset.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inset.user?.name || 'System'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(inset.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsetPage;