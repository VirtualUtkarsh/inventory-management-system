import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import axios from 'axios';

const InsetPage = () => {
  const [formData, setFormData] = useState({
    sku: '',
    orderNo: '',
    bin: '',
    quantity: ''
  });

  const [insets, setInsets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const token = localStorage.getItem('token');

  const fetchInsets = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/insets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInsets(res.data);
    } catch (err) {
      console.error('❌ Fetch failed:', err.response?.data || err.message);
    }
  };

  useEffect(() => {
    fetchInsets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/insets', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormData({ sku: '', orderNo: '', bin: '', quantity: '' });
      setShowForm(false);
      fetchInsets();
    } catch (err) {
      console.error('❌ Submit failed:', err.response?.data || err.message);
    }
  };

  return (
    <div>
      <Navigation />
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-4">📦 Inbound (Inset) Entries</h2>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
          >
            ➕ Add Inbound
          </button>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <input
              type="text"
              placeholder="SKU"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              required
              className="border px-3 py-2 rounded"
            />
            <input
              type="text"
              placeholder="Order No"
              value={formData.orderNo}
              onChange={(e) => setFormData({ ...formData, orderNo: e.target.value })}
              required
              className="border px-3 py-2 rounded"
            />
            <input
              type="text"
              placeholder="Bin"
              value={formData.bin}
              onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
              required
              className="border px-3 py-2 rounded"
            />
            <input
              type="number"
              placeholder="Quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              required
              className="border px-3 py-2 rounded"
            />
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <h3 className="text-xl font-semibold mb-2">📜 Inbound History</h3>

        {insets.length === 0 ? (
          <p className="text-gray-500">No inbound records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-4 py-2">SKU</th>
                  <th className="border px-4 py-2">Order No</th>
                  <th className="border px-4 py-2">Bin</th>
                  <th className="border px-4 py-2">Quantity</th>
                  <th className="border px-4 py-2">User</th>
                  <th className="border px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {insets.map((inset) => (
                  <tr key={inset._id}>
                    <td className="border px-4 py-2">{inset.sku}</td>
                    <td className="border px-4 py-2">{inset.orderNo}</td>
                    <td className="border px-4 py-2">{inset.bin}</td>
                    <td className="border px-4 py-2">{inset.quantity}</td>
                    <td className="border px-4 py-2">{inset.user?.name || 'N/A'}</td>
                    <td className="border px-4 py-2">
                      {new Date(inset.createdAt).toLocaleString()}
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

export default InsetPage;
