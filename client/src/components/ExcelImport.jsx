import React, { useState, useRef } from 'react';
import axios from '../utils/axiosInstance';

const ExcelImport = ({ onImportComplete, onClose }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['.xlsx', '.xls'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (!validTypes.includes(fileExtension)) {
        setError('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }

      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
      setError(null);
      setResults(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('excelFile', file);

      console.log('📤 Uploading file:', file.name);

      const response = await axios.post('/api/inventory/import-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minute timeout for large files
      });

      console.log('✅ Import completed:', response.data);
      setResults(response.data);
      
      // Notify parent component
      if (onImportComplete) {
        onImportComplete(response.data);
      }

    } catch (err) {
      console.error('❌ Upload failed:', err);
      
      if (err.response?.data) {
        setError(err.response.data.message || 'Import failed');
        if (err.response.data.data?.results) {
          setResults(err.response.data);
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

  const resetForm = () => {
    setFile(null);
    setResults(null);
    setError(null);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Import Inventory from Excel</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            disabled={isUploading}
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">📋 Excel Format Requirements:</h3>
            <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
              <li><strong>SKU</strong>: Product SKU identifier (e.g., "BOYTRACK", "FHST01")</li>
              <li><strong>BIN NO.</strong>: Comma-separated bin locations (e.g., "ST-022-005-003,ST-020-008-004")</li>
              <li><strong>SUM of BALANCE</strong>: Total quantity to distribute across bins</li>
              <li>Headers can be in any order, but names should contain these keywords</li>
              <li>Quantity will be split equally across multiple bins</li>
              <li>New bins will be created automatically if they don't exist</li>
            </ul>
          </div>

          {/* File Selection */}
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
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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

            {/* File Info */}
            {file && (
              <div className="mt-2 p-3 bg-gray-50 rounded border">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">📎 {file.name}</span>
                  <span className="text-gray-500">{formatFileSize(file.size)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <span className="text-red-600 text-sm">⚠️ {error}</span>
              </div>
            </div>
          )}

          {/* Upload Button */}
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

          {/* Results Display */}
          {results && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="font-medium text-green-900 mb-2">📊 Import Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-green-700 font-medium">Total Rows:</span>
                    <div className="text-green-900 font-semibold">{results.data.results.summary.totalRows}</div>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Successful:</span>
                    <div className="text-green-900 font-semibold">{results.data.results.summary.successCount}</div>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Errors:</span>
                    <div className="text-green-900 font-semibold">{results.data.results.summary.errorCount}</div>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Success Rate:</span>
                    <div className="text-green-900 font-semibold">{results.data.results.summary.successRate}</div>
                  </div>
                </div>
              </div>

              {/* Created Bins */}
              {results.data.results.createdBins.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h3 className="font-medium text-blue-900 mb-2">🗂️ Auto-Created Bins ({results.data.results.createdBins.length})</h3>
                  <div className="text-sm text-blue-800 max-h-20 overflow-y-auto">
                    {results.data.results.createdBins.join(', ')}
                  </div>
                </div>
              )}

              {/* Errors */}
              {results.data.results.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h3 className="font-medium text-red-900 mb-2">❌ Errors ({results.data.results.errors.length})</h3>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {results.data.results.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-sm text-red-800">
                        <span className="font-medium">Row {error.row}:</span> {error.message}
                      </div>
                    ))}
                    {results.data.results.errors.length > 10 && (
                      <div className="text-sm text-red-600 italic">
                        ... and {results.data.results.errors.length - 10} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {results.data.results.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h3 className="font-medium text-yellow-900 mb-2">⚠️ Warnings ({results.data.results.warnings.length})</h3>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {results.data.results.warnings.slice(0, 10).map((warning, index) => (
                      <div key={index} className="text-sm text-yellow-800">
                        <span className="font-medium">Row {warning.row}:</span> {warning.message}
                      </div>
                    ))}
                    {results.data.results.warnings.length > 10 && (
                      <div className="text-sm text-yellow-600 italic">
                        ... and {results.data.results.warnings.length - 10} more warnings
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Successful Items Preview */}
              {results.data.results.itemsProcessed.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <h3 className="font-medium text-gray-900 mb-2">✅ Successfully Processed Items (showing first 5)</h3>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">SKU</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Bins</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Total Qty</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.data.results.itemsProcessed.slice(0, 5).map((item, index) => (
                          <tr key={index} className="border-t border-gray-200">
                            <td className="px-3 py-2 font-medium text-gray-900">{item.sku}</td>
                            <td className="px-3 py-2 text-gray-600">{item.successfulBins}/{item.totalBins}</td>
                            <td className="px-3 py-2 text-gray-600">{item.totalQuantity}</td>
                            <td className="px-3 py-2">
                              {item.successfulBins === item.totalBins ? (
                                <span className="text-green-600 font-medium">✓ Complete</span>
                              ) : (
                                <span className="text-yellow-600 font-medium">⚠ Partial</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {results.data.results.itemsProcessed.length > 5 && (
                      <div className="text-center text-sm text-gray-500 mt-2">
                        ... and {results.data.results.itemsProcessed.length - 5} more items
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-4 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
            disabled={isUploading}
          >
            {results ? 'Close' : 'Cancel'}
          </button>
          {results && results.data.results.summary.successCount > 0 && (
            <button
              onClick={() => {
                if (onImportComplete) {
                  onImportComplete(results);
                }
                onClose();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Done - Refresh Inventory
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelImport;