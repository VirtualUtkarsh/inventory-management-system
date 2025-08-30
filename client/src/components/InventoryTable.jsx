import React, { useState } from 'react';

export default function InventoryTable({ inventory, onRefresh }) {
  const [sortConfig, setSortConfig] = useState({
    key: 'skuId',
    direction: 'ascending'
  });

  // Sort function
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Apply sorting
  const sortedInventory = React.useMemo(() => {
    let sortableItems = [...inventory];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle null/undefined values
        if (aValue == null) aValue = '';
        if (bValue == null) bValue = '';

        // Handle different data types
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [inventory, sortConfig]);

  // Get stock status styling
  const getStockStatus = (quantity) => {
    if (quantity === 0) {
      return 'text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-semibold';
    } else if (quantity < 10) {
      return 'text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs font-semibold';
    } else {
      return 'text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-semibold';
    }
  };

  const getStockText = (quantity) => {
    if (quantity === 0) return 'Out of Stock';
    if (quantity < 10) return 'Low Stock';
    return 'In Stock';
  };

  const SortableHeader = ({ sortKey, children }) => (
    <th 
      className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200 transition-colors"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortConfig.key === sortKey && (
          <span className="text-blue-600">
            {sortConfig.direction === 'ascending' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );

  if (inventory.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Inventory Found</h3>
        <p className="text-gray-500">Start by adding some inbound items to populate your inventory.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Current Inventory</h3>
          <button
            onClick={onRefresh}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader sortKey="skuId">SKU ID</SortableHeader>
              <SortableHeader sortKey="quantity">Quantity</SortableHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <SortableHeader sortKey="bin">Bin</SortableHeader>
              <SortableHeader sortKey="lastUpdated">Last Updated</SortableHeader>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedInventory.map((item) => {
              return (
                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-blue-800 font-semibold">
                      {item.skuId || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={getStockStatus(item.quantity)}>
                      {getStockText(item.quantity)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                      {item.bin}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.lastUpdated || item.updatedAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>Total: {sortedInventory.length} items</span>
          <span>
            Total Quantity: {sortedInventory.reduce((sum, item) => sum + (item.quantity || 0), 0)}
          </span>
        </div>
      </div>
    </div>
  );
}