import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../utils/axiosInstance';
import { toast } from 'react-toastify';
import InventoryTable from '../components/InventoryTable';
import ExcelImport from '../components/ExcelImport';
import 'react-toastify/dist/ReactToastify.css';

const InventoryPage = () => {
  const { token } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  
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
      'Base SKU',
      'Name',
      'Size',
      'Category',
      'Bin',
      'Quantity',
      'Last Updated'
    ];

    const csvData = filteredInventory.map(item => [
      item.skuId || 'N/A',
      item.baseSku || '',
      item.name || '',
      item.size || '',
      item.category || '',
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
  // const uniqueBaseSKUs = new Set(inventory.map(item => item.baseSku).filter(Boolean)).size;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Inventory Management</h1>
          <p className="text-gray-600">Monitor and track your inventory across all variants</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-blue-100 text-blue-800 p-4 rounded-lg shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide">Total SKUs</h4>
            <p className="text-2xl font-bold">{totalItems}</p>
          </div>
          
          <div className="bg-green-100 text-green-800 p-4 rounded-lg shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide">Total Qty</h4>
            <p className="text-2xl font-bold">{totalQuantity}</p>
          </div>
          
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide">Low Stock</h4>
            <p className="text-2xl font-bold">{lowStockCount}</p>
          </div>
          
          <div className="bg-red-100 text-red-800 p-4 rounded-lg shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide">Out of Stock</h4>
            <p className="text-2xl font-bold">{outOfStockCount}</p>
          </div>
          
          {/* <div className="bg-purple-100 text-purple-800 p-4 rounded-lg shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide">Base SKUs</h4>
            <p className="text-2xl font-bold">{uniqueBaseSKUs}</p>
          </div> */}
          
          <div className="bg-indigo-100 text-indigo-800 p-4 rounded-lg shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide">Bins Used</h4>
            <p className="text-2xl font-bold">{uniqueBins}</p>
          </div>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search SKU</label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search..."
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bin Location</label>
              <input
                type="text"
                name="bin"
                value={filters.bin}
                onChange={handleFilterChange}
                placeholder="Filter by bin..."
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
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
                  name="lowStock"
                  checked={filters.lowStock}
                  onChange={handleFilterChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-4"
                />
                <span className="text-sm text-gray-700">Low Stock (&lt; 10)</span>
              </label>

              <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-md hover:bg-gray-100 cursor-pointer">
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
        </div>

        {/* Results Summary and Actions */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredInventory.length} of {totalItems} inventory items
            {loading && <span className="ml-2 text-blue-600">(Updating...)</span>}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md transition-colors flex items-center gap-2"
              title="Import inventory from Excel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import Excel
            </button>
            
            <button
              onClick={downloadCSV}
              disabled={filteredInventory.length === 0}
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
              disabled={filteredInventory.length === 0}
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

        {/* Table or Error States */}
        {loading && inventory.length === 0 ? (
          <div className="text-center py-8 text-gray-600">Loading inventory...</div>
        ) : error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-4">
            {error}
            <button 
              onClick={throttledRefresh}
              className="ml-4 text-sm underline hover:text-red-800"
            >
              Try Again
            </button>
          </div>
        ) : inventory.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p className="text-lg mb-2">No inventory records found</p>
            <p className="text-sm">Add some inbound items or import from Excel to populate your inventory</p>
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
    </div>
  );
};

export default InventoryPage;