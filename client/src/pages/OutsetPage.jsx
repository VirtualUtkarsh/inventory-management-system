import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';
import { toast } from 'react-toastify';
import {
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  RefreshCw,
  ArrowUpFromLine,
  TrendingDown,
  Calendar,
  User,
  MapPin,
  X,
  AlertTriangle,
  Package,
  ShoppingCart,
  Receipt,
  CheckCircle
} from 'lucide-react';
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
  const [showFilters, setShowFilters] = useState(false);
  const [outsetItems, setOutsetItems] = useState([]);
  const [filteredOutsets, setFilteredOutsets] = useState([]);
  const [loading, setLoading] = useState({ inventory: true, outsets: true });
  const [searchTerm, setSearchTerm] = useState('');

  // Simplified filter states
  const [filters, setFilters] = useState({
    search: '',
    skuId: '',
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
        axiosInstance.get('/api/outsets', {
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

  // Apply filters
  useEffect(() => {
    let filtered = [...outsetItems];

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        (item.skuId || '').toLowerCase().includes(searchTerm) ||
        (item.customerName || '').toLowerCase().includes(searchTerm) ||
        (item.invoiceNo || '').toLowerCase().includes(searchTerm) ||
        (item.bin || '').toLowerCase().includes(searchTerm)
      );
    }

    if (filters.skuId) {
      filtered = filtered.filter(item => 
        (item.skuId || '').toLowerCase().includes(filters.skuId.toLowerCase())
      );
    }

    if (filters.customer) {
      filtered = filtered.filter(item => 
        (item.customerName || '').toLowerCase().includes(filters.customer.toLowerCase())
      );
    }

    if (filters.invoiceNo) {
      filtered = filtered.filter(item => 
        (item.invoiceNo || '').toLowerCase().includes(filters.invoiceNo.toLowerCase())
      );
    }

    if (filters.bin) {
      filtered = filtered.filter(item => 
        (item.bin || '').toLowerCase().includes(filters.bin.toLowerCase())
      );
    }

    if (filters.userName) {
      filtered = filtered.filter(item => 
        (item.user?.name || '').toLowerCase().includes(filters.userName.toLowerCase())
      );
    }

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

    if (filters.recentOnly) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(item => 
        new Date(item.createdAt) >= sevenDaysAgo
      );
    }

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
      skuId: '',
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

      const { data } = await axiosInstance.post('/api/outsets', {
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

  const getUniqueBins = () => {
    const uniqueBins = [...new Set(outsetItems.map(item => item.bin).filter(Boolean))];
    return uniqueBins.sort();
  };

  const getGroupedInventory = () => {
    const grouped = {};
    inventory.forEach(item => {
      const sku = getDisplaySku(item);
      if (!grouped[sku]) {
        grouped[sku] = [];
      }
      grouped[sku].push(item);
    });
    return grouped;
  };

  const downloadCSV = () => {
    if (filteredOutsets.length === 0) return;
    
    const headers = [
      'Date',
      'Time',
      'SKU ID',
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
    toast.success('Outbound records exported to CSV');
  };

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
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f2f2f2; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .print-date { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
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
              <th>SKU ID</th>
              <th>Bin</th>
              <th>Quantity</th>
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
                <td>${item.bin || ''}</td>
                <td>-${item.quantity}</td>
                <td>${item.customerName || ''}</td>
                <td>${item.invoiceNo || ''}</td>
                <td>${item.user?.name || 'System'}</td>
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
  const totalOutbound = outsetItems.length;
  const totalQuantityShipped = outsetItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const todayCount = outsetItems.filter(item => {
    const today = new Date();
    const itemDate = new Date(item.createdAt);
    return itemDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Outbound Management</h1>
          <p className="mt-2 text-gray-600">Track and manage outgoing inventory items</p>
        </div>
        
        <div className="mt-4 lg:mt-0 flex flex-wrap gap-3">
          <button
            onClick={() => setShowProductModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Outbound
          </button>
          
          <button
            onClick={downloadCSV}
            disabled={filteredOutsets.length === 0}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          
          <button
            onClick={printTable}
            disabled={filteredOutsets.length === 0}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ArrowUpFromLine className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Outbound</p>
              <p className="text-2xl font-bold text-gray-900">{totalOutbound}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Qty Shipped</p>
              <p className="text-2xl font-bold text-gray-900">{totalQuantityShipped}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today</p>
              <p className="text-2xl font-bold text-gray-900">{todayCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 -mt-2" />
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search SKU, customer, invoice, or bin..."
                  className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Filter Toggle & Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  showFilters 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>
              
              <button
                onClick={fetchData}
                disabled={loading.outsets}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading.outsets ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear All
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SKU ID</label>
                  <input
                    type="text"
                    name="skuId"
                    value={filters.skuId}
                    onChange={handleFilterChange}
                    placeholder="Filter by SKU ID..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                  <input
                    type="text"
                    name="customer"
                    value={filters.customer}
                    onChange={handleFilterChange}
                    placeholder="Customer name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
                  <input
                    type="text"
                    name="invoiceNo"
                    value={filters.invoiceNo}
                    onChange={handleFilterChange}
                    placeholder="Invoice number..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bin Location</label>
                  <select
                    name="bin"
                    value={filters.bin}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Bins</option>
                    {getUniqueBins().map(bin => (
                      <option key={bin} value={bin}>{bin}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Processed By</label>
                  <input
                    type="text"
                    name="userName"
                    value={filters.userName}
                    onChange={handleFilterChange}
                    placeholder="Filter by user..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    name="dateFrom"
                    value={filters.dateFrom}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    name="dateTo"
                    value={filters.dateTo}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-4 pt-4">
                <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    name="recentOnly"
                    checked={filters.recentOnly}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-4"
                  />
                  <span className="text-sm text-gray-700">Last 7 Days</span>
                </label>

                <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    name="todayOnly"
                    checked={filters.todayOnly}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-4"
                  />
                  <span className="text-sm text-gray-700">Today Only</span>
                </label>

                <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    name="largeQuantity"
                    checked={filters.largeQuantity}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-4"
                  />
                  <span className="text-sm text-gray-700">Large Orders (≥10)</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {filteredOutsets.length} of {totalOutbound} outbound records
          {loading.outsets && <span className="ml-2 text-blue-600">(Updating...)</span>}
        </p>
      </div>

      {/* Outbound Records Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading.outsets && outsetItems.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading outbound records...</p>
          </div>
        ) : filteredOutsets.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No outbound records found</h3>
            <p className="text-gray-500">
              {outsetItems.length === 0 ? 'Create your first outbound record' : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Outbound Records</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {filteredOutsets.length} records • Total quantity: {filteredOutsets.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOutsets.map(item => (
                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(item.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono font-medium text-blue-900 bg-blue-50 px-2 py-1 rounded">
                          {getDisplaySku(item)}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <MapPin className="w-3 h-3 mr-1" />
                          {item.bin}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          -{item.quantity}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ShoppingCart className="w-4 h-4 mr-2 text-gray-400" />
                          <div className="text-sm text-gray-900">{item.customerName}</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Receipt className="w-4 h-4 mr-2 text-gray-400" />
                          <div className="text-sm text-gray-900">{item.invoiceNo}</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="text-sm text-gray-900">{item.user?.name || 'System'}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Summary */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    Total Outbound: {filteredOutsets.length}
                  </span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                    Total Shipped: {filteredOutsets.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                  </span>
                </div>
                
                <div className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Select Product & Bin</h2>
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setSearchTerm('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products by SKU or bin location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const groupedInventory = getGroupedInventory();
                const filteredKeys = Object.keys(groupedInventory).filter(sku => {
                  if (!searchTerm.trim()) return true;
                  const search = searchTerm.toLowerCase();
                  return sku.toLowerCase().includes(search) || 
                         groupedInventory[sku].some(item => item.bin.toLowerCase().includes(search));
                });

                if (loading.inventory) {
                  return (
                    <div className="text-center py-8">
                      <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-600">Loading products...</p>
                    </div>
                  );
                }

                if (filteredKeys.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        {searchTerm.trim() ? 'No products found matching your search.' : 'No products available.'}
                      </p>
                    </div>
                  );
                }

                return filteredKeys.map(sku => (
                  <div key={sku} className="mb-6">
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg mb-3">
                      <Package className="w-5 h-5 text-gray-600 mr-3" />
                      <div>
                        <div className="font-semibold text-gray-900">SKU: {sku}</div>
                        <div className="text-sm text-gray-600">
                          {groupedInventory[sku].length} bin(s) available
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                      {groupedInventory[sku].map(product => (
                        <div
                          key={product._id}
                          onClick={() => handleProductSelect(product)}
                          className="border border-gray-200 p-4 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 group"
                        >
                          <div className="flex justify-between items-center">
                            <div className="space-y-2">
                              <div className="flex items-center text-sm font-medium text-gray-700">
                                <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                                Bin: <span className="font-mono text-blue-600 ml-1">{product.bin}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Package className="w-4 h-4 mr-2 text-gray-500" />
                                Available: <span className="font-semibold text-green-600 ml-1">{product.quantity}</span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 group-hover:text-blue-600 transition-colors">
                              Click to select →
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Outbound Confirmation Modal */}
      {showOutsetModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Confirm Outbound</h2>
                <button
                  onClick={() => {
                    setShowOutsetModal(false);
                    setShowProductModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Product Details */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">SKU:</span>
                  <span className="font-mono text-sm text-blue-900 bg-blue-100 px-2 py-1 rounded">
                    {getDisplaySku(selectedProduct)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">From Bin:</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                    <MapPin className="w-3 h-3 mr-1" />
                    {selectedProduct.bin}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Available:</span>
                  <span className="font-semibold text-green-600">{selectedProduct.quantity}</span>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invoice/Reference No</label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter invoice or reference number"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowOutsetModal(false);
                    setShowProductModal(true);
                  }}
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmOutset}
                  disabled={loading.outsets || !customerName || !invoiceNo}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center"
                >
                  {loading.outsets ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Outbound
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}