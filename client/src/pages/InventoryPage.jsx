import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../utils/axiosInstance';
import { toast } from 'react-toastify';
import InventoryTable from '../components/InventoryTable';
import 'react-toastify/dist/ReactToastify.css';

const InventoryPage = () => {
  const { token } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Refs to handle race conditions and cleanup
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    baseSku: '',
    size: '',
    color: '',
    pack: '',
    category: '',
    lowStock: false,
    outOfStock: false
  });

  // Metadata for filters
  const [metadata, setMetadata] = useState({
    sizes: [],
    colors: [],
    packs: [],
    categories: [],
    baseSKUs: []
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
      
      // Extract unique values for filters
      const uniqueBaseSKUs = [...new Set(data.map(item => item.baseSku).filter(Boolean))];
      const uniqueSizes = [...new Set(data.map(item => item.size).filter(Boolean))];
      const uniqueColors = [...new Set(data.map(item => item.color).filter(Boolean))];
      const uniquePacks = [...new Set(data.map(item => item.pack).filter(Boolean))];
      const uniqueCategories = [...new Set(data.map(item => item.category).filter(Boolean))];
      
      setMetadata(prev => ({
        ...prev,
        baseSKUs: uniqueBaseSKUs.sort(),
        sizes: uniqueSizes.sort(),
        colors: uniqueColors.sort(),
        packs: uniquePacks.sort(),
        categories: uniqueCategories.sort()
      }));
      
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
      filtered = filtered.filter(item => 
        item.color && item.color.includes(filters.color)
      );
    }

    // Pack filter
    if (filters.pack) {
      filtered = filtered.filter(item => item.pack === filters.pack);
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    // Low stock filter (less than 10)
    if (filters.lowStock) {
      filtered = filtered.filter(item => item.quantity > 0 && item.quantity < 10);
    }

    // Out of stock filter
    if (filters.outOfStock) {
      filtered = filtered.filter(item => item.quantity === 0);
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
      color: '',
      pack: '',
      category: '',
      lowStock: false,
      outOfStock: false
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
  const uniqueBaseSKUs = new Set(inventory.map(item => item.baseSku).filter(Boolean)).size;

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
          
          <div className="bg-purple-100 text-purple-800 p-4 rounded-lg shadow-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide">Base SKUs</h4>
            <p className="text-2xl font-bold">{uniqueBaseSKUs}</p>
          </div>
          
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
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search SKU/Name</label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search..."
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
                {metadata.baseSKUs.map(sku => (
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
                {metadata.sizes.map(size => (
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
                {metadata.categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
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
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Low Stock (&lt; 10)</span>
              </label>

              <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-md hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  name="outOfStock"
                  checked={filters.outOfStock}
                  onChange={handleFilterChange}
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Out of Stock</span>
              </label>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredInventory.length} of {totalItems} inventory items
            {loading && <span className="ml-2 text-blue-600">(Updating...)</span>}
          </p>
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
            <p className="text-sm">Add some inbound items to populate your inventory</p>
          </div>
        ) : (
          <InventoryTable 
            inventory={filteredInventory} 
            onRefresh={throttledRefresh}
          />
        )}
      </div>
    </div>
  );
};

export default InventoryPage;