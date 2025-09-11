import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function OutsetPage() {
  const { user, token } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showOutsetModal, setShowOutsetModal] = useState(false);
  const [outsetItems, setOutsetItems] = useState([]);
  const [filteredOutsets, setFilteredOutsets] = useState([]);
  const [loading, setLoading] = useState({ inventory: true, outsets: true });
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    baseSku: '',
    size: '',
    color: '',
    pack: '',
    category: '',
    customer: '',
    invoiceNo: '',
    bin: '',
    userName: '',
    dateFrom: '',
    dateTo: '',
    recentOnly: false,
    todayOnly: false,
    largeQuantity: false
  });

  const fetchData = useCallback(async () => {
    try {
      const [inventoryRes, outsetsRes] = await Promise.all([
        axiosInstance.get('/api/inventory', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axiosInstance.get('/api/outset', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setInventory(inventoryRes.data.filter(item => item.quantity > 0));
      setOutsetItems(outsetsRes.data);
      setFilteredOutsets(outsetsRes.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading({ inventory: false, outsets: false });
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filters whenever filters or outsets change
  useEffect(() => {
    let filtered = [...outsetItems];

    // Search filter (searches SKU ID, name, customer, invoice, and bin)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        (item.skuId || item.sku || '').toLowerCase().includes(searchTerm) ||
        (item.name || '').toLowerCase().includes(searchTerm) ||
        (item.customerName || '').toLowerCase().includes(searchTerm) ||
        (item.invoiceNo || '').toLowerCase().includes(searchTerm) ||
        (item.bin || '').toLowerCase().includes(searchTerm)
      );
    }

    // Base SKU filter
    if (filters.baseSku) {
      filtered = filtered.filter(item => item.baseSku === filters.baseSku);
    }

    // Size filter
    if (filters.size) {
      filtered = filtered.filter(item => item.size === filters.size);
    }

    // Color filter
    if (filters.color) {
      filtered = filtered.filter(item => item.color === filters.color);
    }

    // Pack filter
    if (filters.pack) {
      filtered = filtered.filter(item => item.pack === filters.pack);
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    // Customer filter
    if (filters.customer) {
      filtered = filtered.filter(item => 
        (item.customerName || '').toLowerCase().includes(filters.customer.toLowerCase())
      );
    }

    // Invoice number filter
    if (filters.invoiceNo) {
      filtered = filtered.filter(item => 
        (item.invoiceNo || '').toLowerCase().includes(filters.invoiceNo.toLowerCase())
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

    // Large quantity filter (quantity >= 10)
    if (filters.largeQuantity) {
      filtered = filtered.filter(item => item.quantity >= 10);
    }

    setFilteredOutsets(filtered);
  }, [filters, outsetItems]);

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
      baseSku: '',
      size: '',
      color: '',
      pack: '',
      category: '',
      customer: '',
      invoiceNo: '',
      bin: '',
      userName: '',
      dateFrom: '',
      dateTo: '',
      recentOnly: false,
      todayOnly: false,
      largeQuantity: false
    });
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setCustomerName('');
    setInvoiceNo('');
    setSearchTerm('');
    setShowProductModal(false);
    setShowOutsetModal(true);
  };

  const handleConfirmOutset = async () => {
    if (!selectedProduct || !customerName || !invoiceNo) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, outsets: true }));

      const { data } = await axiosInstance.post('/api/outset', {
        skuId: selectedProduct.skuId,
        quantity: parseInt(quantity),
        customerName,
        invoiceNo,
        user: {
          id: user.id,
          name: user.name
        },
        bin: selectedProduct.bin
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOutsetItems(prev => [data, ...prev]);
      const { data: updatedInventory } = await axiosInstance.get('/api/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInventory(updatedInventory.filter(item => item.quantity > 0));

      toast.success('Outbound item recorded!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record outbound');
    } finally {
      setSelectedProduct(null);
      setShowOutsetModal(false);
      setSearchTerm('');
      setLoading(prev => ({ ...prev, outsets: false }));
    }
  };

  const getDisplaySku = (item) => {
    return item.skuId || item.sku || 'N/A';
  };

  const getDisplayName = (item) => {
    if (item.name) return item.name;
    return `Item ${getDisplaySku(item)}`;
  };

  // CSV Download function
  const downloadCSV = () => {
    if (filteredOutsets.length === 0) return;
    
    const headers = [
      'Date',
      'Time',
      'SKU',
      'Name',
      'Size',
      'Color',
      'Pack',
      'Category',
      'Bin',
      'Quantity',
      'Customer',
      'Invoice',
      'User'
    ];
    
    const csvData = filteredOutsets.map(item => [
      new Date(item.createdAt).toLocaleDateString(),
      new Date(item.createdAt).toLocaleTimeString(),
      getDisplaySku(item),
      getDisplayName(item),
      item.size || '',
      item.color || '',
      item.pack || '',
      item.category || '',
      item.bin || '',
      item.quantity,
      item.customerName || '',
      item.invoiceNo || '',
      item.user?.name || 'System'
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `outbound-records-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print function
  const printTable = () => {
    if (filteredOutsets.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Outbound Records</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; text-align: center; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .no-print { display: none; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Outbound Records</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <p>Total Records: ${filteredOutsets.length}</p>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>SKU</th>
              <th>Name</th>
              <th>Details</th>
              <th>Bin</th>
              <th>Qty</th>
              <th>Customer</th>
              <th>Invoice</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            ${filteredOutsets.map(item => `
              <tr>
                <td>${new Date(item.createdAt).toLocaleDateString()}</td>
                <td>${getDisplaySku(item)}</td>
                <td>${getDisplayName(item)}</td>
                <td>${[item.size, item.color, item.pack, item.category].filter(Boolean).join(', ')}</td>
                <td>${item.bin || ''}</td>
                <td>-${item.quantity}</td>
                <td>${item.customerName || ''}</td>
                <td>${item.invoiceNo || ''}</td>
                <td>${item.user?.name || 'System'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
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
  const totalOutbound = outsetItems.length;
  // const todayCount = outsetItems.filter(item => {
  //   const today = new Date();
  //   const itemDate = new Date(item.createdAt);
  //   return itemDate.toDateString() === today.toDateString();
  // }).length;
  // const totalQuantity = outsetItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  // const uniqueCustomers = new Set(outsetItems.map(item => item.customerName).filter(Boolean)).size;
  // const uniqueInvoices = new Set(outsetItems.map(item => item.invoiceNo).filter(Boolean)).size;
  // const uniqueBaseSKUs = new Set(outsetItems.map(item => item.baseSku).filter(Boolean)).size;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Outbound Management</h1>
          <p className="text-gray-600">Track and manage outgoing inventory items</p>
        </div>

        {/* Summary Cards */}
        {/* <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-blue-100 text-blue-800 p-4 rounded-lg shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide">Total Records</h4>
            <p className="text-2xl font-bold">{totalOutbound}</p>
          </div>
          
          <div className="bg-red-100 text-red-800 p-4 rounded-lg shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide">Total Qty Out</h4>
            <p className="text-2xl font-bold">{totalQuantity}</p>
          </div>
          
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide">Today</h4>
            <p className="text-2xl font-bold">{todayCount}</p>
          </div>
          
          <div className="bg-purple-100 text-purple-800 p-4 rounded-lg shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide">Base SKUs</h4>
            <p className="text-2xl font-bold">{uniqueBaseSKUs}</p>
          </div>
          
          <div className="bg-green-100 text-green-800 p-4 rounded-lg shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide">Customers</h4>
            <p className="text-2xl font-bold">{uniqueCustomers}</p>
          </div>
          
          <div className="bg-indigo-100 text-indigo-800 p-4 rounded-lg shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide">Invoices</h4>
            <p className="text-2xl font-bold">{uniqueInvoices}</p>
          </div>
        </div> */}

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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="SKU, Customer, Invoice, Bin..."
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Base SKU Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base SKU</label>
              <select
                name="baseSku"
                value={filters.baseSku}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Base SKUs</option>
                {[...new Set(outsetItems.map(item => item.baseSku).filter(Boolean))].sort().map(sku => (
                  <option key={sku} value={sku}>{sku}</option>
                ))}
              </select>
            </div>

            {/* Size Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <select
                name="size"
                value={filters.size}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sizes</option>
                {[...new Set(outsetItems.map(item => item.size).filter(Boolean))].sort().map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {[...new Set(outsetItems.map(item => item.category).filter(Boolean))].sort().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Customer Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <input
                type="text"
                name="customer"
                value={filters.customer}
                onChange={handleFilterChange}
                placeholder="Customer name..."
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Invoice No Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
              <input
                type="text"
                name="invoiceNo"
                value={filters.invoiceNo}
                onChange={handleFilterChange}
                placeholder="Invoice number..."
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

              <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-md hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  name="largeQuantity"
                  checked={filters.largeQuantity}
                  onChange={handleFilterChange}
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-4"
                />
                <span className="text-sm text-gray-700">Large Orders (≥10)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Results Summary and Actions */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredOutsets.length} of {totalOutbound} outbound records
          </p>
          <div className="flex gap-2">
            <button
              onClick={downloadCSV}
              disabled={filteredOutsets.length === 0}
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
              disabled={filteredOutsets.length === 0}
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

        {/* Action Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Outbound Records</h2>
          <button
            onClick={() => setShowProductModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            + New Outbound
          </button>
        </div>

        {/* Outbound History Table */}
        <div className="bg-white p-4 rounded-lg shadow">
          {loading.outsets ? (
            <div className="text-center py-8 text-gray-600">Loading outbound records...</div>
          ) : filteredOutsets.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg mb-2">No outbound records found</p>
              <p className="text-sm">
                {outsetItems.length === 0 ? 'Create your first outbound record' : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium">Date</th>
                    <th className="px-4 py-3 text-xs font-medium">SKU</th>
                    <th className="px-4 py-3 text-xs font-medium">Name</th>
                    <th className="px-4 py-3 text-xs font-medium">Details</th>
                    <th className="px-4 py-3 text-xs font-medium">Bin</th>
                    <th className="px-4 py-3 text-xs font-medium">Qty</th>
                    <th className="px-4 py-3 text-xs font-medium">Customer</th>
                    <th className="px-4 py-3 text-xs font-medium">Invoice</th>
                    <th className="px-4 py-3 text-xs font-medium">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOutsets.map(item => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="text-sm">{new Date(item.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-4 py-2 font-mono text-blue-800 font-semibold">
                        {getDisplaySku(item)}
                      </td>
                      <td className="px-4 py-2">{getDisplayName(item)}</td>
                      <td className="px-4 py-2">
                        {(item.size || item.color || item.pack || item.category) ? (
                          <div className="flex flex-wrap gap-1">
                            {item.size && <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs">{item.size}</span>}
                            {item.color && <span className="bg-green-100 text-green-800 px-1 py-0.5 rounded text-xs">{item.color}</span>}
                            {item.pack && <span className="bg-purple-100 text-purple-800 px-1 py-0.5 rounded text-xs">{item.pack}</span>}
                            {item.category && <span className="bg-orange-100 text-orange-800 px-1 py-0.5 rounded text-xs">{item.category}</span>}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2">{item.bin}</td>
                      <td className="px-4 py-2 text-red-600 font-semibold">-{item.quantity}</td>
                      <td className="px-4 py-2">{item.customerName}</td>
                      <td className="px-4 py-2">{item.invoiceNo}</td>
                      <td className="px-4 py-2">{item.user?.name || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Product Selection Modal */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold mb-4">Select Product</h2>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search products by SKU, name, or bin..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {(() => {
                  const filteredInventory = inventory.filter(product => {
                    if (!searchTerm.trim()) return true;
                    const search = searchTerm.toLowerCase();
                    const sku = getDisplaySku(product).toLowerCase();
                    const name = getDisplayName(product).toLowerCase();
                    const bin = product.bin.toLowerCase();
                    
                    return (
                      sku.includes(search) ||
                      name.includes(search) ||
                      bin.includes(search) ||
                      (product.size && product.size.toLowerCase().includes(search)) ||
                      (product.color && product.color.toLowerCase().includes(search)) ||
                      (product.pack && product.pack.toLowerCase().includes(search)) ||
                      (product.category && product.category.toLowerCase().includes(search))
                    );
                  });

                  if (filteredInventory.length === 0) {
                    return (
                      <div className="text-center text-gray-500 py-8">
                        {searchTerm.trim() ? 'No products found matching your search.' : 'No products available.'}
                      </div>
                    );
                  }

                  return filteredInventory.map(product => (
                    <div
                      key={product._id}
                      onClick={() => handleProductSelect(product)}
                      className="border p-3 rounded-lg mb-2 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                    >
                      <div className="font-medium">{getDisplayName(product)}</div>
                      <div className="text-sm text-gray-600 mb-1">
                        SKU: <span className="font-mono">{getDisplaySku(product)}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Qty: {product.quantity} | Bin: {product.bin}
                      </div>
                      {(product.size || product.color || product.pack || product.category) && (
                        <div className="flex flex-wrap gap-1">
                          {product.size && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">{product.size}</span>}
                          {product.color && <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">{product.color}</span>}
                          {product.pack && <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">{product.pack}</span>}
                          {product.category && <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs">{product.category}</span>}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
              <div className="p-6 border-t">
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setSearchTerm('');
                  }}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Outbound Confirmation Modal */}
        {showOutsetModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
              <h2 className="text-lg font-semibold">Confirm Outbound</h2>
              <div className="bg-gray-100 p-3 rounded">
                <p className="font-semibold">{getDisplayName(selectedProduct)}</p>
                <p className="text-sm text-gray-600 font-mono">
                  SKU: {getDisplaySku(selectedProduct)}
                </p>
                <p className="text-sm text-gray-600">
                  Bin: {selectedProduct.bin}
                </p>
                {(selectedProduct.size || selectedProduct.color || selectedProduct.pack || selectedProduct.category) && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedProduct.size && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">{selectedProduct.size}</span>}
                    {selectedProduct.color && <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">{selectedProduct.color}</span>}
                    {selectedProduct.pack && <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">{selectedProduct.pack}</span>}
                    {selectedProduct.category && <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs">{selectedProduct.category}</span>}
                  </div>
                )}
              </div>
              <input
                type="number"
                min="1"
                max={selectedProduct.quantity}
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    Math.max(1, Math.min(Number(e.target.value), selectedProduct.quantity))
                  )
                }
                className="w-full border px-3 py-2 rounded"
                placeholder="Quantity"
              />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border px-3 py-2 rounded"
                placeholder="Customer Name"
              />
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full border px-3 py-2 rounded"
                placeholder="Invoice/Reference No"
              />
              <div className="flex justify-between">
                <button
                  onClick={() => {
                    setShowOutsetModal(false);
                    setShowProductModal(true);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmOutset}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {loading.outsets ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}