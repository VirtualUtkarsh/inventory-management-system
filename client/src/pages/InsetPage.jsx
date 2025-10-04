//Enhanced UI with batch import functionality and searchable bin selector
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import ExcelImport from '../components/ExcelImport';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  RefreshCw,
  ArrowDownToLine,
  TrendingUp,
  Calendar,
  User,
  MapPin,
  X,
  AlertTriangle,
  Package,
  Upload,
  Layers
} from 'lucide-react';
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
  const [bins, setBins] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [binsLoading, setBinsLoading] = useState(true);
  const [binSearchTerm, setBinSearchTerm] = useState('');
  const [showBinDropdown, setShowBinDropdown] = useState(false);

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

  const fetchBins = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/metadata/bins', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBins(res.data);
    } catch (err) {
      console.error('Error fetching bins:', err);
      if (err.response?.status === 404) {
        setError('No bins available. Please contact admin to add bins first.');
      }
    } finally {
      setBinsLoading(false);
    }
  }, [token]);

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

  const handleImportComplete = useCallback((results) => {
    console.log('Import completed:', results);
    
    if (results.data && results.data.results) {
      const { results: importResults } = results.data;
      
      if (importResults.successCount > 0) {
        toast.success(
          `Successfully imported ${importResults.successCount} inbound records. ` +
          `Refreshing data...`
        );
        setTimeout(() => {
          fetchInsets();
          setShowImportModal(false);
        }, 1000);
      }
      
      if (importResults.errorCount > 0) {
        toast.warning(`${importResults.errorCount} records had errors during import.`);
      }
      
      if (importResults.warnings && importResults.warnings.length > 0) {
        toast.info(`${importResults.warnings.length} records had warnings during import.`);
      }
    } else {
      toast.success('Import completed successfully. Refreshing inbound records...');
      setTimeout(() => {
        fetchInsets();
        setShowImportModal(false);
      }, 1000);
    }
  }, [fetchInsets]);

  useEffect(() => {
    fetchBins();
    fetchInsets();
  }, [fetchBins, fetchInsets]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showBinDropdown && !event.target.closest('.bin-dropdown-container')) {
        setShowBinDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBinDropdown]);

  useEffect(() => {
    let filtered = [...insets];

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        (item.skuId || '').toLowerCase().includes(searchTerm) ||
        (item.bin || '').toLowerCase().includes(searchTerm)
      );
    }

    if (filters.skuId) {
      filtered = filtered.filter(item => 
        (item.skuId || '').toLowerCase().includes(filters.skuId.toLowerCase())
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
    if (error) setError(null);
  };

  const getFilteredBins = () => {
    if (!binSearchTerm) return bins;
    return bins.filter(bin => 
      bin.name.toLowerCase().includes(binSearchTerm.toLowerCase())
    );
  };

  const handleBinSelect = (binName) => {
    setFormData(prev => ({ ...prev, bin: binName }));
    setBinSearchTerm(binName);
    setShowBinDropdown(false);
  };

  const handleBinSearchChange = (e) => {
    const value = e.target.value;
    setBinSearchTerm(value);
    setShowBinDropdown(true);
    if (formData.bin && !bins.find(b => b.name === value)) {
      setFormData(prev => ({ ...prev, bin: '' }));
    }
  };

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
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    setError(null);

    const submissionData = {
      skuId: formData.skuId.trim().toUpperCase(),
      bin: formData.bin,
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
      
      setFormData({
        skuId: '',
        bin: '',
        quantity: ''
      });
      setBinSearchTerm('');
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
    setBinSearchTerm('');
    setShowBinDropdown(false);
  };

  const downloadCSV = () => {
    if (filteredInsets.length === 0) return;

    const headers = ['SKU ID', 'Bin', 'Quantity', 'Added By', 'Date'];
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
    toast.success('Inbound records exported to CSV');
  };

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

  const totalInbound = insets.length;
  const totalQuantityAdded = insets.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const todayCount = insets.filter(item => {
    const today = new Date();
    const itemDate = new Date(item.createdAt);
    return itemDate.toDateString() === today.toDateString();
  }).length;
  const uniqueSkus = [...new Set(insets.map(item => item.skuId).filter(Boolean))].length;

  if (binsLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading inbounds...</p>
        </div>
      </div>
    );
  }

  if (bins.length === 0 && !binsLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inbound Management</h1>
          <p className="text-gray-600">Track and manage incoming inventory items</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Bins Available</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            No bins have been configured yet. Please contact your administrator to add bins before creating inbound records.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-yellow-800 text-sm">
              <strong>Admin Note:</strong> Bins can be added from the Admin Dashboard → Bins Manager
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inbound Management</h1>
          <p className="mt-2 text-gray-600">Track and manage incoming inventory items</p>
        </div>
        
        <div className="mt-4 lg:mt-0 flex flex-wrap gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Inbound Item
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
          </button>
          
          <button
            onClick={downloadCSV}
            disabled={filteredInsets.length === 0}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          
          <button
            onClick={printTable}
            disabled={filteredInsets.length === 0}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ArrowDownToLine className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Inbound</p>
              <p className="text-2xl font-bold text-gray-900">{totalInbound}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Qty Added</p>
              <p className="text-2xl font-bold text-gray-900">{totalQuantityAdded}</p>
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
            <div className="p-2 bg-orange-100 rounded-lg">
              <Layers className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unique SKUs</p>
              <p className="text-2xl font-bold text-gray-900">{uniqueSkus}</p>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Add New Inbound Item</h2>
              <p className="text-gray-600 mt-1">Enter the details for the incoming inventory item</p>
            </div>
            <button
              onClick={resetForm}
              className="p-2 text-gray-700 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-7 h-7" />
            </button>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="skuId"
                  value={formData.skuId}
                  onChange={handleChange}
                  placeholder="e.g. TS1156-L-RED-PACK10"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="relative bin-dropdown-container">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bin Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none -mt-2" />
                  <input
                    type="text"
                    value={binSearchTerm}
                    onChange={handleBinSearchChange}
                    onFocus={() => setShowBinDropdown(true)}
                    placeholder="Search and select bin..."
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
                
                {showBinDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {getFilteredBins().length > 0 ? (
                      <ul className="py-1">
                        {getFilteredBins().map(bin => (
                          <li
                            key={bin._id}
                            onClick={() => handleBinSelect(bin.name)}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900 flex items-center justify-between"
                          >
                            <span>{bin.name}</span>
                            {formData.bin === bin.name && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No bins found matching "{binSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
                
                {formData.bin && (
                  <div className="mt-2 text-xs text-green-600 flex items-center">
                    <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
                    Selected: {formData.bin}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="1"
                  placeholder="Enter quantity"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || bins.length === 0}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Add Inbound Item'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 -mt-2" />
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search SKU or bin location..."
                  className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
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
                onClick={fetchInsets}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Added By</label>
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
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {filteredInsets.length} of {totalInbound} inbound records
          {loading && <span className="ml-2 text-blue-600">(Updating...)</span>}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading && insets.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading inbound records...</p>
          </div>
        ) : filteredInsets.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No inbound records found</h3>
            <p className="text-gray-500">
              {insets.length === 0 ? 'Add some inbound items to get started' : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Inbound Records</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {filteredInsets.length} records • Total quantity: {filteredInsets.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bin Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInsets.map((inset) => (
                    <tr key={inset._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono font-medium text-blue-900 bg-blue-50 px-2 py-1 rounded">
                          {inset.skuId || 'N/A'}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <MapPin className="w-3 h-3 mr-1" />
                          {inset.bin}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          +{inset.quantity}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="text-sm text-gray-900">{inset.user?.name || 'System'}</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {new Date(inset.createdAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Total Inbound: {filteredInsets.length}
                  </span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    Total Quantity: {filteredInsets.reduce((sum, item) => sum + (item.quantity || 0), 0)}
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

      {showImportModal && (
        <ExcelImport
          importType="inbound"
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
};

export default InsetPage;