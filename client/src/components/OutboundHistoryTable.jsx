import React from 'react';
import {
  Calendar,
  User,
  MapPin,
  ShoppingCart,
  Receipt,
  Package,
  ShoppingBag,
  RefreshCw
} from 'lucide-react';

const OutboundHistoryTable = ({ 
  outsetItems, 
  filteredOutsets, 
  loading = false 
}) => {
  const getDisplaySku = (item) => {
    return item.skuId || item.sku || 'N/A';
  };

  if (loading && outsetItems.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-12 text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading outbound records...</p>
        </div>
      </div>
    );
  }

  if (filteredOutsets.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No outbound records found</h3>
          <p className="text-gray-500">
            {outsetItems.length === 0 
              ? 'Process your first outbound to see records here' 
              : 'Try adjusting your filters to see more records'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Outbound History</h3>
            <p className="text-sm text-gray-600 mt-1">
              {filteredOutsets.length} records • Total quantity: {filteredOutsets.reduce((sum, item) => sum + (item.quantity || 0), 0)}
            </p>
          </div>
          {loading && (
            <div className="flex items-center text-sm text-blue-600">
              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              Updating...
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice
              </th>
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th> */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Processed By
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOutsets.map(item => (
              <TableRow key={item._id} item={item} getDisplaySku={getDisplaySku} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              Total Records: {filteredOutsets.length}
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
              Total Shipped: {filteredOutsets.reduce((sum, item) => sum + (item.quantity || 0), 0)}
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
              Batch Records: {filteredOutsets.filter(item => item.batchId).length}
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              Single Records: {filteredOutsets.filter(item => !item.batchId).length}
            </span>
          </div>
          
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

const TableRow = ({ item, getDisplaySku }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const { date, time } = formatDate(item.createdAt);

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Date & Time */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-900">{date}</div>
            <div className="text-xs text-gray-500">{time}</div>
          </div>
        </div>
      </td>
      
      {/* SKU ID */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="text-sm font-mono font-medium text-blue-900 bg-blue-50 px-2 py-1 rounded">
            {getDisplaySku(item)}
          </div>
          {item.name && item.name !== getDisplaySku(item) && (
            <div className="ml-2 text-xs text-gray-500 max-w-24 truncate" title={item.name}>
              {item.name}
            </div>
          )}
        </div>
      </td>
      
      {/* Bin */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <MapPin className="w-3 h-3 mr-1" />
          {item.bin}
        </span>
      </td>
      
      {/* Quantity */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            -{item.quantity}
          </span>
          {item.quantity >= 10 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-800 rounded">
              Large
            </span>
          )}
        </div>
      </td>
      
      {/* Customer */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <ShoppingCart className="w-4 h-4 mr-2 text-gray-400" />
          <div className="text-sm text-gray-900 max-w-32 truncate" title={item.customerName}>
            {item.customerName}
          </div>
        </div>
      </td>
      
      {/* Invoice */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <Receipt className="w-4 h-4 mr-2 text-gray-400" />
          <div className="text-sm text-gray-900 max-w-32 truncate" title={item.invoiceNo}>
            {item.invoiceNo}
          </div>
        </div>
      </td>

      {/* Type */}
      {/* <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            item.batchId 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {item.batchId ? (
              <>
                <ShoppingBag className="w-3 h-3 mr-1" />
                Batch
              </>
            ) : (
              <>
                <Package className="w-3 h-3 mr-1" />
                Single
              </>
            )}
          </span>
          {item.batchId && (
            <div className="text-xs text-gray-500" title={`Batch ID: ${item.batchId}`}>
              #{item.batchId.slice(-6)}
            </div>
          )}
        </div>
      </td> */}
      
      {/* Processed By */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <div className="text-sm text-gray-900">{item.user?.name || 'System'}</div>
            {item.user?.id && (
              <div className="text-xs text-gray-500">
                {new Date(item.createdAt).toLocaleTimeString('en-IN', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

export default OutboundHistoryTable;