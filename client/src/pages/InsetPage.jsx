import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';

const InsetPage = () => {
  const { user, token } = useAuth();
  
  const [formData, setFormData] = useState({
    baseSku: '',
    size: '',
    color: '',
    pack: '',
    category: '',
    name: '',
    orderNo: '',
    bin: '',
    quantity: ''
  });

  const [metadata, setMetadata] = useState({
    sizes: [],
    colors: [],
    packs: [],
    categories: []
  });

  const [insets, setInsets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auto-generated SKU preview
  const [previewSku, setPreviewSku] = useState('');

  // Fetch metadata on component mount
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
        
        setMetadata({
          sizes: sizesRes.data,
          colors: colorsRes.data,
          packs: packsRes.data,
          categories: categoriesRes.data
        });
      } catch (err) {
        console.error('Error fetching metadata:', err);
        setError('Failed to load metadata. Please ensure you have admin access and metadata is configured.');
      } finally {
        setMetadataLoading(false);
      }
    };

    fetchMetadata();
  }, [token]);

  // Fetch insets
  const fetchInsets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get('/api/insets', {
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
  }, [token]);

  // Update SKU preview when relevant fields change
  useEffect(() => {
    const { baseSku, size, color, pack } = formData;
    if (baseSku && size && color && pack) {
      setPreviewSku(`${baseSku}-${size}-${color}-${pack}`);
    } else {
      setPreviewSku('');
    }
  }, [formData.baseSku, formData.size, formData.color, formData.pack]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? Number(value) : value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  // Form validation function
  const validateForm = () => {
    const requiredFields = ['baseSku', 'size', 'color', 'pack', 'category', 'name', 'orderNo', 'bin', 'quantity'];
    
    for (let field of requiredFields) {
      if (!formData[field] || formData[field] === '' || formData[field] === 0) {
        return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    }
    
    if (formData.quantity <= 0) {
      return 'Quantity must be greater than 0';
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Frontend validation
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    setError(null);

    // Prepare submission data with user info
    const submissionData = {
      baseSku: formData.baseSku.trim().toUpperCase(),
      size: formData.size.trim().toUpperCase(),
      color: formData.color.trim().toUpperCase(),
      pack: formData.pack.trim(),
      category: formData.category.trim(),
      name: formData.name.trim(),
      orderNo: formData.orderNo.trim(),
      bin: formData.bin.trim().toUpperCase(),
      quantity: Number(formData.quantity),
      user: {
        id: user.id,
        name: user.name
      }
    };

    console.log('Submitting:', JSON.stringify(submissionData, null, 2));

    try {
      const response = await axiosInstance.post('/api/insets', submissionData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Success response:', response.data);
      
      // Reset form
      setFormData({
        baseSku: '',
        size: '',
        color: '',
        pack: '',
        category: '',
        name: '',
        orderNo: '',
        bin: '',
        quantity: ''
      });
      setShowForm(false);
      await fetchInsets();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Submission failed';
      setError(errorMessage);
      console.error('Submit error:', err);
      console.error('Error response:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      baseSku: '',
      size: '',
      color: '',
      pack: '',
      category: '',
      name: '',
      orderNo: '',
      bin: '',
      quantity: ''
    });
    setShowForm(false);
    setError(null);
  };

  if (metadataLoading) {
    return <div className="p-4 text-lg">Loading metadata...</div>;
  }

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
            <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Add New Inbound Item</h3>
              
              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}
              
              {/* SKU Generation Section */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-md font-medium mb-3 text-blue-800">SKU Generation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Base SKU */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base SKU *</label>
                    <input
                      type="text"
                      name="baseSku"
                      value={formData.baseSku}
                      onChange={handleChange}
                      placeholder="e.g. TS1156"
                      required
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Size Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size *</label>
                    <select
                      name="size"
                      value={formData.size}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Size</option>
                      {metadata.sizes.map(size => (
                        <option key={size._id} value={size.name}>
                          {size.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Color Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color *</label>
                    <select
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Color</option>
                      {metadata.colors.map(color => (
                        <option key={color._id} value={color.name}>
                          {color.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pack Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pack *</label>
                    <select
                      name="pack"
                      value={formData.pack}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Pack</option>
                      {metadata.packs.map(pack => (
                        <option key={pack._id} value={pack.name}>
                          {pack.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SKU Preview */}
                {previewSku && (
                  <div className="mt-3 p-3 bg-white rounded border-l-4 border-blue-500">
                    <span className="text-sm text-gray-600">Generated SKU: </span>
                    <span className="font-mono font-bold text-blue-800">{previewSku}</span>
                  </div>
                )}
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    {metadata.categories.map(category => (
                      <option key={category._id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Item Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Cotton T-Shirt"
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Order Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Number *</label>
                  <input
                    type="text"
                    name="orderNo"
                    value={formData.orderNo}
                    onChange={handleChange}
                    placeholder="e.g. ORD-2024-001"
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Bin Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bin Location *</label>
                  <input
                    type="text"
                    name="bin"
                    value={formData.bin}
                    onChange={handleChange}
                    placeholder="e.g. A1-B2"
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Quantity */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    min="1"
                    placeholder="Enter quantity"
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-md transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Inbound'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Inbound History */}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pack</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {insets.map((inset) => (
                    <tr key={inset._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-800 font-semibold">
                        {inset.skuId || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inset.baseSku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inset.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inset.size}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inset.color}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inset.pack}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inset.category}</td>
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