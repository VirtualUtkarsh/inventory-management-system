import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const InsetPage = () => {
  const { user, token } = useAuth();
  
  const [formData, setFormData] = useState({
    skuId: '',
    bin: '',
    quantity: ''
  });

  const [insets, setInsets] = useState([]);
  const [filteredInsets, setFilteredInsets] = useState([]);
  const [bins, setBins] = useState([]); // Available bins from admin
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [binsLoading, setBinsLoading] = useState(true);

  // Simplified filter states
  const [filters, setFilters] = useState({
    search: '',
    skuId: '',
    bin: '',
    userName: '',
    dateFrom: '',
    dateTo: '',
    recentOnly: false,
    todayOnly: false
  });

  // Fetch available bins
  const fetchBins = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/metadata/bins', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBins(res.data);
    } catch (err) {
      console.error('Error fetching bins:', err);
      // If no bins are available, show a message
      if (err.response?.status === 404) {
        setError('No bins available. Please contact admin to add bins first.');
      }
    } finally {
      setBinsLoading(false);
    }
  }, [token]);

  // Fetch insets using useCallback
  const fetchInsets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get('/api/insets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInsets(res.data);
      setFilteredInsets(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBins();
    fetchInsets();
  }, [fetchBins, fetchInsets]);

  // Apply filters whenever filters or insets changes
  useEffect(() => {
    let filtered = [...insets];

    // Search filter (searches SKU ID and bin)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        (item.skuId || '').toLowerCase().includes(searchTerm) ||
        (item.bin || '').toLowerCase().includes(searchTerm)
      );
    }

    // SKU ID filter
    if (filters.skuId) {
      filtered = filtered.filter(item => 
        (item.skuId || '').toLowerCase().includes(filters.skuId.toLowerCase())
      );
    }

    // Bin filter
    if (filters.bin) {
      filtered = filtered.filter(item => 
        (item.bin || '').toLowerCase().includes(filters.bin.toLowerCase())
      );
    }

    // User name filter
    if (filters.userName) {
      filtered = filtered.filter(item => 
        (item.user?.name || '').toLowerCase().includes(filters.userName.toLowerCase())
      );
    }

    // Date filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(item => 
        new Date(item.createdAt) >= fromDate
      );
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => 
        new Date(item.createdAt) <= toDate
      );
    }

    // Recent only (last 7 days)
    if (filters.recentOnly) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(item => 
        new Date(item.createdAt) >= sevenDaysAgo
      );
    }

    // Today only
    if (filters.todayOnly) {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt);
        return itemDate >= startOfDay && itemDate <= endOfDay;
      });
    }

    setFilteredInsets(filtered);
  }, [filters, insets]);

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      skuId: '',
      bin: '',
      userName: '',
      dateFrom: '',
      dateTo: '',
      recentOnly: false,
      todayOnly: false
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? Number(value) : value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  // Simplified form validation
  const validateForm = () => {
    const requiredFields = ['skuId', 'bin', 'quantity'];
    
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
      skuId: formData.skuId.trim().toUpperCase(),
      bin: formData.bin, // Keep as selected from dropdown
      quantity: Number(formData.quantity),
      user: {
        id: user.id,
        name: user.name
      }
    };

    try {
      await axiosInstance.post('/api/insets', submissionData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Reset form
      setFormData({
        skuId: '',
        bin: '',
        quantity: ''
      });
      setShowForm(false);
      await fetchInsets();
      toast.success('Inbound item added successfully!');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Submission failed';
      setError(errorMessage);
      console.error('Submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      skuId: '',
      bin: '',
      quantity: ''
    });
    setShowForm(false);
    setError(null);
  };

  // Get unique bins from filtered insets for filter dropdown
  const getUniqueBins = () => {
    const uniqueBins = [...new Set(insets.map(item => item.bin).filter(Boolean))];
    return uniqueBins.sort();
  };

  // Download CSV function
  const downloadCSV = () => {
    if (filteredInsets.length === 0) return;

    const headers = [
      'SKU ID',
      'Bin',
      'Quantity',
      'Added By',
      'Date'
    ];

    const csvData = filteredInsets.map(item => [
      item.skuId || 'N/A',
      item.bin || '',
      item.quantity || 0,
      item.user?.name || 'System',
      new Date(item.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inbound_records_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print table function
  const printTable = () => {
    if (filteredInsets.length === 0) return;

    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inbound Records</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f2f2f2; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .print-date { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>Inbound Records</h1>
        <p>Total Records: ${filteredInsets.length}</p>
        <table>
          <thead>
            <tr>
              <th>SKU ID</th>
              <th>Bin</th>
              <th>Quantity</th>
              <th>Added By</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInsets.map(item => `
              <tr>
                <td>${item.skuId || 'N/A'}</td>
                <td>${item.bin || ''}</td>
                <td>+${item.quantity || 0}</td>
                <td>${item.user?.name || 'System'}</td>
                <td>${new Date(item.createdAt).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="print-date">
          Generated on: ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Calculate metrics
  const totalInbound = insets.length;

  // Show loading if bins are still loading
  if (binsLoading) {
    return <div className="p-4 text-lg">Loading bins...</div>;
  }

  // Show error if no bins available
  if (bins.length === 0 && !binsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Bins Available</h2>
          <p className="text-gray-600 mb-4">No bins have been configured yet. Please contact your administrator to add bins before creating inbound records.</p>
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Admin can add bins from the Admin Dashboard → Bins Manager
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Inbound Management</h1>
          <p className="text-gray-600">Track and manage incoming inventory items</p>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear All Filters
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="SKU, Bin..."
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* SKU ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU ID</label>
              <input
                type="text"
                name="skuId"
                value={filters.skuId}
                onChange={handleFilterChange}
                placeholder="Filter by SKU ID..."
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Bin Filter - Now using dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bin Location</label>
              <select
                name="bin"
                value={filters.bin}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Bins</option>
                {getUniqueBins().map(bin => (
                  <option key={bin} value={bin}>{bin}</option>
                ))}
              </select>
            </div>

            {/* User Name Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Added By</label>
              <input
                type="text"
                name="userName"
                value={filters.userName}
                onChange={handleFilterChange}
                placeholder="Filter by user..."
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Filters</h4>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-md hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  name="recentOnly"
                  checked={filters.recentOnly}
                  onChange={handleFilterChange}
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-4"
                />
                <span className="text-sm text-gray-700">Last 7 Days</span>
              </label>

              <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-md hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  name="todayOnly"
                  checked={filters.todayOnly}
                  onChange={handleFilterChange}
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-4"
                />
                <span className="text-sm text-gray-700">Today Only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Results Summary and Actions */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredInsets.length} of {totalInbound} inbound records
          </p>
          <div className="flex gap-2">
            <button
              onClick={downloadCSV}
              disabled={filteredInsets.length === 0}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm rounded-md transition-colors flex items-center gap-1"
              title="Download filtered data as CSV"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV
            </button>
            <button
              onClick={printTable}
              disabled={filteredInsets.length === 0}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm rounded-md transition-colors flex items-center gap-1"
              title="Print filtered data"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Inbound Records</h2>
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
              
              {/* Simplified form with only 3 fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* SKU ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU ID *</label>
                  <input
                    type="text"
                    name="skuId"
                    value={formData.skuId}
                    onChange={handleChange}
                    placeholder="e.g. TS1156-L-RED-PACK10"
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Bin Location - Now a dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bin Location *</label>
                  <select
                    name="bin"
                    value={formData.bin}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a bin...</option>
                    {bins.map(bin => (
                      <option key={bin._id} value={bin.name}>{bin.name}</option>
                    ))}
                  </select>
                  {bins.length === 0 && (
                    <p className="text-sm text-red-600 mt-1">No bins available. Contact admin to add bins.</p>
                  )}
                </div>

                {/* Quantity */}
                <div>
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
                  disabled={loading || bins.length === 0}
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

          {/* Inbound History Table - Simplified */}
          <div className="overflow-x-auto mt-6 w-full">
            {loading && insets.length === 0 ? (
              <div className="text-center py-8 text-gray-600">Loading inbound records...</div>
            ) : filteredInsets.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <p className="text-lg mb-2">No inbound records found</p>
                <p className="text-sm">
                  {insets.length === 0 ? 'Add some inbound items to get started' : 'Try adjusting your filters'}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bin Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInsets.map((inset) => (
                    <tr key={inset._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-800 font-semibold">
                        {inset.skuId || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inset.bin}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">+{inset.quantity}</td>
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