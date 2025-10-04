import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../utils/axiosInstance';
import { toast } from 'react-toastify';
import InventoryTable from '../components/InventoryTable';
import ExcelImport from '../components/ExcelImport';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Printer, 
  RefreshCw,
  Package,
  TrendingUp,
  AlertTriangle,
  Archive,
  X
} from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

const InventoryPage = () => {
  const { token } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Refs to handle race conditions and cleanup
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    baseSku: '',
    size: '',
    category: '',
    fromDate: '',
    toDate: '',
    lowStock: false,
    outOfStock: false,
    bin: ''
  });

  // Cleanup function for component unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Fetch inventory function
  const fetchInventory = useCallback(async () => {
    try {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      const currentRequestId = ++requestIdRef.current;

      setLoading(true);
      setError('');

      const { data } = await axios.get('/api/inventory', {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortControllerRef.current.signal
      });

      // Check if component is still mounted and this is the latest request
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return;
      }

      setInventory(data);
      setFilteredInventory(data);
      
    } catch (err) {
      // Don't show error if request was aborted (race condition handling)
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }

      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      setError('Failed to fetch inventory');
      toast.error('Error loading inventory');
      console.error('Inventory fetch error:', err);
    } finally {
      // Only update loading state if component is still mounted
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [token]);

  // Handle Excel import completion
  const handleImportComplete = useCallback((results) => {
    console.log('Import completed:', results);
    setShowImportModal(false);
    
    if (results.data && results.data.results && results.data.results.summary) {
      const { summary } = results.data.results;
      
      if (summary.successCount > 0) {
        toast.success(
          `Successfully imported ${summary.successCount} items. ` +
          `${summary.createdBinsCount > 0 ? `Created ${summary.createdBinsCount} new bins. ` : ''}` +
          `Refreshing inventory...`
        );
        
        // Refresh inventory data after successful import
        setTimeout(() => {
          fetchInventory();
        }, 1000);
      }
      
      if (summary.errorCount > 0) {
        toast.warning(`${summary.errorCount} items had errors during import.`);
      }
      
      if (summary.warningCount > 0) {
        toast.info(`${summary.warningCount} items had warnings during import.`);
      }
    } else {
      toast.success('Import completed successfully. Refreshing inventory...');
      setTimeout(() => {
        fetchInventory();
      }, 1000);
    }
  }, [fetchInventory]);

  // Download CSV function
  const downloadCSV = () => {
    if (filteredInventory.length === 0) return;

    const headers = [
      'SKU ID',
      'Bin',
      'Quantity',
      'Last Updated'
    ];

    const csvData = filteredInventory.map(item => [
      item.skuId || 'N/A',
      item.bin || '',
      item.quantity || 0,
      item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Inventory data exported to CSV');
  };

  // Print table function
  const printTable = () => {
    if (filteredInventory.length === 0) return;

    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; text-align: center; }
          .summary { text-align: center; margin: 20px 0; }
          .summary-item { display: inline-block; margin: 0 15px; padding: 5px 10px; background-color: #f0f0f0; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .quantity-cell { text-align: center; font-weight: bold; }
          .low-stock { color: #d97706; }
          .out-of-stock { color: #dc2626; }
          .print-date { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>Inventory Report</h1>
        <div class="summary">
          <div class="summary-item">Total Items: ${filteredInventory.length}</div>
          <div class="summary-item">Total Quantity: ${filteredInventory.reduce((sum, item) => sum + (item.quantity || 0), 0)}</div>
          <div class="summary-item">Low Stock: ${filteredInventory.filter(item => item.quantity > 0 && item.quantity < 10).length}</div>
          <div class="summary-item">Out of Stock: ${filteredInventory.filter(item => item.quantity === 0).length}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>SKU ID</th>
              <th>Bin</th>
              <th>Quantity</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInventory.map(item => `
              <tr>
                <td>${item.skuId || 'N/A'}</td>
                <td>${item.bin || ''}</td>
                <td class="quantity-cell ${item.quantity === 0 ? 'out-of-stock' : item.quantity < 10 ? 'low-stock' : ''}">${item.quantity || 0}</td>
                <td>${item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}</td>
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

  // Initial fetch
  useEffect(() => {
    if (token) {
      fetchInventory();
    }
  }, [token, fetchInventory]);

  // Apply filters whenever filters or inventory changes
  useEffect(() => {
    let filtered = [...inventory];

    // Search filter (searches SKU ID and name)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        (item.skuId || '').toLowerCase().includes(searchTerm) ||
        (item.name || '').toLowerCase().includes(searchTerm)
      );
    }

    // Date range filters
    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.updatedAt || item.createdAt);
        return itemDate >= fromDate;
      });
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.updatedAt || item.createdAt);
        return itemDate <= toDate;
      });
    }

    // Low stock filter (less than 10)
    if (filters.lowStock) {
      filtered = filtered.filter(item => item.quantity > 0 && item.quantity < 10);
    }

    // Out of stock filter
    if (filters.outOfStock) {
      filtered = filtered.filter(item => item.quantity === 0);
    }

    // Bin filter
    if (filters.bin) {
      filtered = filtered.filter(item => 
        (item.bin || '').toLowerCase().includes(filters.bin.toLowerCase())
      );
    }

    setFilteredInventory(filtered);
  }, [filters, inventory]);

  const handleFilterChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      baseSku: '',
      size: '',
      category: '',
      fromDate: '',
      toDate: '',
      lowStock: false,
      outOfStock: false,
      bin: ''
    });
  }, []);

  // Throttled refresh to prevent multiple rapid calls
  const throttledRefresh = useCallback(() => {
    if (!loading) {
      fetchInventory();
    }
  }, [fetchInventory, loading]);

  // Calculate metrics
  const totalItems = inventory.length;
  const totalQuantity = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const lowStockCount = inventory.filter(item => item.quantity > 0 && item.quantity < 10).length;
  const outOfStockCount = inventory.filter(item => item.quantity === 0).length;
  const uniqueBins = new Set(inventory.map(item => item.bin).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="mt-2 text-gray-600">Monitor and manage your inventory across all variants</p>
        </div>
        
        <div className="mt-4 lg:mt-0 flex flex-wrap gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
          </button>
          
          <button
            onClick={downloadCSV}
            disabled={filteredInventory.length === 0}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          
          <button
            onClick={printTable}
            disabled={filteredInventory.length === 0}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total SKUs</p>
              <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Qty</p>
              <p className="text-2xl font-bold text-gray-900">{totalQuantity}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">{outOfStockCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Archive className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Bins Used</p>
              <p className="text-2xl font-bold text-gray-900">{uniqueBins}</p>
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
                  placeholder="Search SKU or name..."
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
                onClick={throttledRefresh}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-LG font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bin Location</label>
                  <input
                    type="text"
                    name="bin"
                    value={filters.bin}
                    onChange={handleFilterChange}
                    placeholder="Filter by bin..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    name="toDate"
                    value={filters.toDate}
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
                    name="lowStock"
                    checked={filters.lowStock}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-4"
                  />
                  <span className="text-sm text-gray-700">Low Stock (&lt; 10)</span>
                </label>

                <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    name="outOfStock"
                    checked={filters.outOfStock}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-4"
                  />
                  <span className="text-sm text-gray-700">Out of Stock</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {filteredInventory.length} of {totalItems} inventory items
          {loading && <span className="ml-2 text-blue-600">(Updating...)</span>}
        </p>
      </div>

      {/* Table or Error States */}
      {loading && inventory.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error Loading Inventory</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button 
                onClick={throttledRefresh}
                className="mt-3 text-sm text-red-700 underline hover:text-red-800"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      ) : inventory.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory records found</h3>
          <p className="text-gray-500">Add some inbound items or import from Excel to populate your inventory</p>
        </div>
      ) : (
        <InventoryTable 
          inventory={filteredInventory} 
          onRefresh={throttledRefresh}
        />
      )}

      {/* Excel Import Modal */}
      {showImportModal && (
        <ExcelImport
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
};

export default InventoryPage;