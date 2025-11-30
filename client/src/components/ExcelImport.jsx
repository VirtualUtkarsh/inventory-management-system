// client/src/components/ExcelImport.jsx - UPDATED VERSION
import React, { useState, useRef } from 'react';
import axios from '../utils/axiosInstance';

const ExcelImport = ({
  onImportComplete,
  onClose,
  importType = 'inventory',
}) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const fileInputRef = useRef(null);

  const getImportEndpoint = () => {
    if (importType === 'inbound') {
      return '/api/insets/import-excel';
    } else {
      return '/api/inventory/import-excel';
    }
  };

  const getInstructions = () => {
    if (importType === 'inbound') {
      return {
        title: 'Import Inbound Records from Excel',
        requirements: [
          'SKU: Product SKU identifier (e.g., "BOYTRACK", "FHST01")',
          'BIN: Single bin location (e.g., "ST-022-005-003")',
          'QUANTITY: Quantity to add to inbound',
          'Headers can be in any order, but names should contain these keywords',
          '⚠️ IMPORTANT: Bins must already exist in database - they will NOT be auto-created',
          'Records with non-existent bins will be returned as failed entries',
          'Current user will be automatically assigned to each record',
          'Date/time will be automatically set to current time',
        ],
      };
    } else {
      return {
        title: 'Import Inventory from Excel',
        requirements: [
          'SKU: Product SKU identifier (e.g., "BOYTRACK", "FHST01")',
          'BIN: Single bin location (e.g., "ST-022-005-003")',
          'QUANTITY: Quantity to add to inventory',
          'Headers can be in any order, but names should contain these keywords',
          'New bins will be created automatically if they don\'t exist',
        ],
      };
    }
  };

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    const validTypes = ['.xlsx', '.xls'];
    const fileExt = selectedFile.name
      .toLowerCase()
      .substring(selectedFile.name.lastIndexOf('.'));
    if (!validTypes.includes(fileExt)) {
      setError('Please select a valid Excel file (.xlsx or .xls)');
      setFile(null);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResults(null);
    setShowSummary(false);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResults(null);
    setShowSummary(false);

    try {
      const formData = new FormData();
      formData.append('excelFile', file);

      console.log('📤 Uploading file:', file.name, 'as', importType);

      const response = await axios.post(getImportEndpoint(), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      });

      console.log('✅ Import completed - Full response:', response.data);
      
      // Handle different response structures
      let flatResults;
      
      if (response.data?.data?.results) {
        const apiResults = response.data.data.results;
        const summary = apiResults.summary || {};
        
        flatResults = {
          totalRows: summary.totalRows || 0,
          successCount: summary.successCount || 0,
          errorCount: summary.errorCount || 0,
          warningCount: summary.warningCount || 0,
          stats: {
            successRate: summary.successRate || '0%'
          },
          createdBins: apiResults.createdBins || [],
          summary: apiResults.itemsProcessed || [],
          errors: apiResults.errors || [],
          warnings: apiResults.warnings || [],
          failedEntries: apiResults.failedEntries || [] // 🚀 NEW
        };
      } else if (response.data?.totalRows !== undefined) {
        flatResults = {
          totalRows: response.data.totalRows || 0,
          successCount: response.data.successCount || 0,
          errorCount: response.data.errorCount || 0,
          warningCount: response.data.warningCount || 0,
          stats: {
            successRate: response.data.stats?.successRate || '0%'
          },
          createdBins: response.data.createdBins || [],
          summary: response.data.summary || [],
          errors: response.data.errors || [],
          warnings: response.data.warnings || [],
          failedEntries: response.data.failedEntries || [] // 🚀 NEW
        };
      } else {
        console.warn('Unknown response structure:', response.data);
        flatResults = {
          totalRows: 0,
          successCount: 0,
          errorCount: 0,
          warningCount: 0,
          stats: { successRate: '0%' },
          createdBins: [],
          summary: [],
          errors: [],
          warnings: [],
          failedEntries: []
        };
      }
      
      console.log('📊 Processed results:', flatResults);
      setResults(flatResults);
      setShowSummary(true);

    } catch (err) {
      console.error('❌ Upload failed:', err);
      if (err.response?.data) {
        setError(err.response.data.message || 'Import failed');
        
        let flatResults;
        
        if (err.response.data?.data?.results) {
          const apiResults = err.response.data.data.results;
          const summary = apiResults.summary || {};
          
          flatResults = {
            totalRows: summary.totalRows || 0,
            successCount: summary.successCount || 0,
            errorCount: summary.errorCount || 0,
            warningCount: summary.warningCount || 0,
            stats: { successRate: summary.successRate || '0%' },
            createdBins: apiResults.createdBins || [],
            summary: apiResults.itemsProcessed || [],
            errors: apiResults.errors || [],
            warnings: apiResults.warnings || [],
            failedEntries: apiResults.failedEntries || []
          };
        } else if (err.response.data?.totalRows !== undefined) {
          flatResults = {
            ...err.response.data,
            failedEntries: err.response.data.failedEntries || []
          };
        }
        
        if (flatResults && flatResults.totalRows > 0) {
          setResults(flatResults);
          setShowSummary(true);
        }
      } else if (err.code === 'ECONNABORTED') {
        setError('Upload timeout. File may be too large or connection is slow.');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleComplete = () => {
    if (onImportComplete && results) {
      onImportComplete(results);
    }
    onClose();
  };

  const resetForm = () => {
    setFile(null);
    setResults(null);
    setError(null);
    setShowSummary(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 🚀 NEW: Download failed entries as CSV
  const downloadFailedEntries = () => {
    if (!results?.failedEntries || results.failedEntries.length === 0) return;

    const headers = ['Row', 'SKU', 'Bin', 'Quantity', 'Failure Reason'];
    const csvData = results.failedEntries.map(entry => [
      entry.row || 'N/A',
      entry.sku || 'N/A',
      entry.bin || 'N/A',
      entry.quantity || 0,
      entry.reason || entry.error || 'Unknown error'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `failed_entries_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const instructions = getInstructions();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">{instructions.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            disabled={isUploading}
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {!showSummary && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <h3 className="font-medium text-blue-900 mb-2">📋 Excel Format Requirements:</h3>
                <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                  {instructions.requirements.map((req, idx) => {
                    const isWarning = req.includes('⚠️');
                    return (
                      <li key={idx} className={isWarning ? 'font-semibold text-red-700' : ''}>
                        {req}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Excel File (.xlsx or .xls)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500
                               file:mr-4 file:py-2 file:px-4 file:rounded file:border-0
                               file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700
                               hover:file:bg-blue-100"
                    disabled={isUploading}
                  />
                  {file && (
                    <button
                      onClick={resetForm}
                      className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                      disabled={isUploading}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {file && (
                  <div className="mt-2 p-3 bg-gray-50 rounded border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">📎 {file.name}</span>
                      <span className="text-gray-500">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex">
                    <span className="text-red-600 text-sm">⚠️ {error}</span>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <button
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  className={`w-full py-3 px-4 rounded-md font-medium ${
                    !file || isUploading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                  } transition-colors duration-200`}
                >
                  {isUploading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing Excel File...
                    </div>
                  ) : (
                    'Import Excel File'
                  )}
                </button>
              </div>
            </>
          )}

          {results && showSummary && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="font-medium text-green-900 mb-2">📊 Import Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-green-700 font-medium">Total Rows:</span>
                    <div className="text-green-900 font-semibold">
                      {results.totalRows || 0}
                    </div>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Successful:</span>
                    <div className="text-green-900 font-semibold">
                      {results.successCount || 0}
                    </div>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Errors:</span>
                    <div className="text-green-900 font-semibold">
                      {results.errorCount || 0}
                    </div>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Success Rate:</span>
                    <div className="text-green-900 font-semibold">
                      {results.stats?.successRate || '0%'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 🚀 NEW: Failed Entries Section */}
              {results.failedEntries?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-red-900">
                      ❌ Failed Entries ({results.failedEntries.length})
                    </h3>
                    <button
                      onClick={downloadFailedEntries}
                      className="text-sm px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                    >
                      Download CSV
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-red-100 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left">Row</th>
                          <th className="px-2 py-1 text-left">SKU</th>
                          <th className="px-2 py-1 text-left">Bin</th>
                          <th className="px-2 py-1 text-left">Qty</th>
                          <th className="px-2 py-1 text-left">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.failedEntries.map((entry, idx) => (
                          <tr key={idx} className="border-t border-red-200">
                            <td className="px-2 py-1 font-medium">{entry.row}</td>
                            <td className="px-2 py-1">{entry.sku}</td>
                            <td className="px-2 py-1">{entry.bin}</td>
                            <td className="px-2 py-1">{entry.quantity}</td>
                            <td className="px-2 py-1 text-red-800">{entry.reason || entry.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importType === 'inventory' && results.createdBins?.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h3 className="font-medium text-blue-900 mb-2">
                    🗂️ Auto-Created Bins ({results.createdBins.length})
                  </h3>
                  <div className="text-sm text-blue-800 max-h-20 overflow-y-auto">
                    {results.createdBins.join(', ')}
                  </div>
                </div>
              )}

              {results.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h3 className="font-medium text-red-900 mb-2">
                    ❌ Errors ({results.errors.length})
                  </h3>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {results.errors.slice(0, 10).map((errObj, idx) => (
                      <div key={idx} className="text-sm text-red-800">
                        <span className="font-medium">Row {errObj.row}:</span> {errObj.message}
                      </div>
                    ))}
                    {results.errors.length > 10 && (
                      <div className="text-sm text-red-600 italic">
                        ... and {results.errors.length - 10} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}

              {results.warnings?.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h3 className="font-medium text-yellow-900 mb-2">
                    ⚠️ Warnings ({results.warnings.length})
                  </h3>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {results.warnings.slice(0, 10).map((warnObj, idx) => (
                      <div key={idx} className="text-sm text-yellow-800">
                        <span className="font-medium">Row {warnObj.row}:</span> {warnObj.message}
                      </div>
                    ))}
                    {results.warnings.length > 10 && (
                      <div className="text-sm text-yellow-600 italic">
                        ... and {results.warnings.length - 10} more warnings
                      </div>
                    )}
                  </div>
                </div>
              )}

              {results.summary?.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <h3 className="font-medium text-gray-900 mb-2">
                    ✅ Successfully Processed Items (showing first 5)
                  </h3>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">SKU</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            {importType === 'inbound' ? 'Bin' : 'Bins'}
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Quantity</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.summary.slice(0, 5).map((item, idx) => (
                          <tr key={idx} className="border-t border-gray-200">
                            <td className="px-3 py-2 font-medium text-gray-900">{item.sku}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {importType === 'inbound'
                                ? item.bin || 'N/A'
                                : `${item.successfulBins || 0}/${item.totalBins || 1}`}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {item.totalQuantity || item.quantity || 0}
                            </td>
                            <td className="px-3 py-2">
                              {importType === 'inbound' ? (
                                <span className="text-green-600 font-medium">✓ Added</span>
                              ) : item.successfulBins === item.totalBins ? (
                                <span className="text-green-600 font-medium">✓ Complete</span>
                              ) : (
                                <span className="text-yellow-600 font-medium">⚠ Partial</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {results.summary.length > 5 && (
                      <div className="text-center text-sm text-gray-500 mt-2">
                        ... and {results.summary.length - 5} more items
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4 p-6 border-t bg-gray-50">
          {!showSummary ? (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              disabled={isUploading}
            >
              Cancel
            </button>
          ) : (
            <>
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              >
                Import Another File
              </button>
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Done - Refresh Data
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default ExcelImport;