import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';
import { toast } from 'react-toastify';
import { useOutboundCart } from '../hooks/useOutboundCart';
import ProductSelector from '../components/ProductSelector';
import OutboundCart from '../components/OutboundCart';
import OutboundHistoryTable from '../components/OutboundHistoryTable';
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
  ShoppingCart,
  X
} from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

export default function OutsetPage() {
  const { user, token } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [outsetItems, setOutsetItems] = useState([]);
  const [filteredOutsets, setFilteredOutsets] = useState([]);
  const [loading, setLoading] = useState({ 
    inventory: true, 
    outsets: true, 
    processing: false 
  });
  
  // Modal states
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Cart functionality
  const {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartSummary
  } = useOutboundCart();

  // Filter states
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
    largeQuantity: false,
    batchOnly: false
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
      setLoading(prev => ({ ...prev, inventory: false, outsets: false }));
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filters
  useEffect(() => {
    let filtered = [...outsetItems];

    Object.entries(filters).forEach(([key, value]) => {
      if (!value) return;

      switch (key) {
        case 'search':
          const searchTerm = value.toLowerCase();
          filtered = filtered.filter(item => 
            (item.skuId || '').toLowerCase().includes(searchTerm) ||
            (item.customerName || '').toLowerCase().includes(searchTerm) ||
            (item.invoiceNo || '').toLowerCase().includes(searchTerm) ||
            (item.bin || '').toLowerCase().includes(searchTerm)
          );
          break;
        
        case 'skuId':
          filtered = filtered.filter(item => 
            (item.skuId || '').toLowerCase().includes(value.toLowerCase())
          );
          break;
        
        case 'customer':
          filtered = filtered.filter(item => 
            (item.customerName || '').toLowerCase().includes(value.toLowerCase())
          );
          break;
        
        case 'invoiceNo':
          filtered = filtered.filter(item => 
            (item.invoiceNo || '').toLowerCase().includes(value.toLowerCase())
          );
          break;
        
        case 'bin':
  filtered = filtered.filter(item => 
    (item.bin || '').replace(/\s+/g, '').toLowerCase().includes(
      value.replace(/\s+/g, '').toLowerCase()
    )
  );
  break;

        
        case 'userName':
          filtered = filtered.filter(item => 
            (item.user?.name || '').toLowerCase().includes(value.toLowerCase())
          );
          break;
        
        case 'dateFrom':
          const fromDate = new Date(value);
          fromDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(item => 
            new Date(item.createdAt) >= fromDate
          );
          break;
        
        case 'dateTo':
          const toDate = new Date(value);
          toDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter(item => 
            new Date(item.createdAt) <= toDate
          );
          break;
        
        case 'recentOnly':
          if (value) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            filtered = filtered.filter(item => 
              new Date(item.createdAt) >= sevenDaysAgo
            );
          }
          break;
        
        case 'todayOnly':
          if (value) {
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
          break;
        
        case 'largeQuantity':
          if (value) {
            filtered = filtered.filter(item => item.quantity >= 10);
          }
          break;
        
        case 'batchOnly':
          if (value) {
            filtered = filtered.filter(item => item.batchId);
          }
          break;
            default:
        // do nothing (avoids ESLint warning)
        break;
      }
    });

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
      largeQuantity: false,
      batchOnly: false
    });
  };

  const handleProcessCart = async (cartData) => {
    try {
      setLoading(prev => ({ ...prev, processing: true }));

      console.log('🛒 Processing cart with data:', cartData);
      console.log('📦 Cart items:', cartData.items);

      let response;
      if (cartData.items.length === 1) {
        // Single item - use existing endpoint
        const item = cartData.items[0];
        console.log('🔄 Using single item endpoint for:', item);
        
        response = await axiosInstance.post('/api/outsets', {
          skuId: item.skuId,
          quantity: item.quantity,
          bin: item.bin,
          customerName: cartData.customerName,
          invoiceNo: cartData.invoiceNo,
          user: {
            id: user.id,
            name: user.name
          }
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Single outbound response:', response.data);
        toast.success('Outbound processed successfully!');
      } else {
        // Multiple items - use batch endpoint
        console.log('🔄 Using batch endpoint for multiple items');
        console.log('📤 Batch request payload:', {
          items: cartData.items,
          customerName: cartData.customerName,
          invoiceNo: cartData.invoiceNo,
          user: {
            id: user.id,
            name: user.name
          }
        });

        response = await axiosInstance.post('/api/outsets/batch', {
          items: cartData.items,
          customerName: cartData.customerName,
          invoiceNo: cartData.invoiceNo,
          user: {
            id: user.id,
            name: user.name
          }
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Batch outbound response:', response.data);
        const { successfulItems, failedItems, errors } = response.data;
        
        if (failedItems > 0) {
          toast.warning(`${successfulItems} items processed, ${failedItems} failed. Check console for details.`);
          console.error('Batch processing errors:', errors);
        } else {
          toast.success(`Batch outbound completed! ${successfulItems} items processed successfully.`);
        }
      }

      // Clear cart and refresh data
      clearCart();
      setShowCart(false);
      await fetchData();

    } catch (error) {
      console.error('🚨 Cart processing error:', error);
      console.error('🚨 Error response:', error.response);
      console.error('🚨 Error config:', error.config);
      
      if (error.response?.status === 404) {
        toast.error('API endpoint not found. Please check if the batch route is properly configured.');
        console.error('🚨 404 Error - Route not found. Check server/routes/outset.js');
      } else {
        toast.error(error.response?.data?.message || 'Failed to process outbound');
      }
    } finally {
      setLoading(prev => ({ ...prev, processing: false }));
    }
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
      'User',
      'Type'
      // 'Batch ID'
    ];
    
    const csvData = filteredOutsets.map(item => [
      new Date(item.createdAt).toLocaleDateString(),
      new Date(item.createdAt).toLocaleTimeString(),
      item.skuId || '',
      item.bin || '',
      item.quantity,
      item.customerName || '',
      item.invoiceNo || '',
      item.user?.name || 'System',
      item.batchId ? 'Batch' : 'Single'
      // item.batchId || ''
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
              <th>Type</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            ${filteredOutsets.map(item => `
              <tr>
                <td>${new Date(item.createdAt).toLocaleDateString()}</td>
                <td>${item.skuId || ''}</td>
                <td>${item.bin || ''}</td>
                <td>-${item.quantity}</td>
                <td>${item.customerName || ''}</td>
                <td>${item.invoiceNo || ''}</td>
                <td>${item.batchId ? 'Batch' : 'Single'}</td>
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

  // const getUniqueBins = () => {
  //   const uniqueBins = [...new Set(outsetItems.map(item => item.bin).filter(Boolean))];
  //   return uniqueBins.sort();
  // };

  // Calculate metrics
  const totalOutbound = outsetItems.length;
  const totalQuantityShipped = outsetItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const todayCount = outsetItems.filter(item => {
    const today = new Date();
    const itemDate = new Date(item.createdAt);
    return itemDate.toDateString() === today.toDateString();
  }).length;

  const cartSummary = getCartSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Outbound Management</h1>
          <p className="mt-2 text-gray-600">
            Add items to cart and process outbound transactions
          </p>
        </div>
        
        <div className="mt-4 lg:mt-0 flex flex-wrap gap-3">
          <button
            onClick={() => setShowProductSelector(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Products
          </button>

          <button
            onClick={() => setShowCart(true)}
            className="relative inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Cart
            {cartSummary.totalItems > 0 && (
              <span className="absolute -top-2 -right-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center">
                {cartSummary.totalItems}
              </span>
            )}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Items in Cart</p>
              <p className="text-2xl font-bold text-gray-900">{cartSummary.totalItems}</p>
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
                className={`inline-flex items-center px-4 py-2 text-base font-medium rounded-lg border transition-colors ${
                  showFilters 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>
              
              <button
                onClick={fetchData}
                disabled={loading.outsets}
                className="inline-flex items-center px-4 py-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
  <input
    type="text"
    name="bin"
    value={filters.bin}
    onChange={handleFilterChange}
    placeholder="Search bin location..."
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
  />
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
                <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    name="recentOnly"
                    checked={filters.recentOnly}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-4"
                  />
                  <span className="text-sm text-gray-700">Last 7 Days</span>
                </label>

                <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    name="todayOnly"
                    checked={filters.todayOnly}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-4"
                  />
                  <span className="text-sm text-gray-700">Today Only</span>
                </label>

                <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    name="largeQuantity"
                    checked={filters.largeQuantity}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-4"
                  />
                  <span className="text-sm text-gray-700">Large Orders (≥10)</span>
                </label>

                <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    name="batchOnly"
                    checked={filters.batchOnly}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-4"
                  />
                  <span className="text-sm text-gray-700">Batch Orders Only</span>
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
        
        {cartSummary.totalItems > 0 && (
          <div className="flex items-center space-x-4 text-sm text-purple-600 bg-purple-50 px-4 py-2 rounded-lg">
            <ShoppingCart className="w-4 h-4" />
            <span>
              {cartSummary.totalItems} items in cart ({cartSummary.totalQuantity} units)
            </span>
            <button
              onClick={() => setShowCart(true)}
              className="text-purple-700 hover:text-purple-800 font-medium underline"
            >
              Review Cart
            </button>
          </div>
        )}
      </div>

      {/* Outbound History Table */}
      <OutboundHistoryTable
        outsetItems={outsetItems}
        filteredOutsets={filteredOutsets}
        loading={loading.outsets}
      />

      {/* Modals */}
      {showProductSelector && (
  <ProductSelector
    inventory={inventory}
    cartItems={cartItems}
    onAddToCart={addToCart}
    onClose={() => setShowProductSelector(false)}
    loading={loading.inventory}
  />
)}

      {showCart && (
        <OutboundCart
          cartItems={cartItems}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onClearCart={clearCart}
          onProcessCart={handleProcessCart}
          onClose={() => setShowCart(false)}
          loading={loading.processing}
        />
      )}
    </div>
  );
}