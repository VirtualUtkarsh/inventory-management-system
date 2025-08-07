import React, { useState, useEffect } from 'react';
// Remove Navigation import
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function OutsetPage() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showOutsetModal, setShowOutsetModal] = useState(false);
  const [outsetItems, setOutsetItems] = useState([]);
  const [loading, setLoading] = useState({ inventory: true, outsets: true });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inventoryRes, outsetsRes] = await Promise.all([
          axios.get('/api/inventory'),
          axios.get('/api/outset')
        ]);
        setInventory(inventoryRes.data.filter(item => item.quantity > 0));
        setOutsetItems(outsetsRes.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load data');
      } finally {
        setLoading({ inventory: false, outsets: false });
      }
    };
    fetchData();
  }, []);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setCustomerName('');
    setInvoiceNo('');
    setSearchTerm(''); // Clear search when selecting a product
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

      const { data } = await axios.post('/api/outset', {
        sku: selectedProduct.sku,
        quantity: parseInt(quantity),
        customerName,
        invoiceNo,
        userId: user.id,
        userName: user.name,
        bin: selectedProduct.bin
      });

      setOutsetItems(prev => [data, ...prev]);
      const { data: updatedInventory } = await axios.get('/api/inventory');
      setInventory(updatedInventory.filter(item => item.quantity > 0));

      toast.success('Outbound item recorded!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record outbound');
    } finally {
      setSelectedProduct(null);
      setShowOutsetModal(false);
      setSearchTerm(''); // Clear search after successful outset
      setLoading(prev => ({ ...prev, outsets: false }));
    }
  };

  return (
    <div>
      {/* Remove Navigation component */}
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📤 Outbound Management</h1>
          <button
            onClick={() => setShowProductModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            + New Outbound
          </button>
        </div>

        {/* Inventory Preview */}
        <div className="mb-8 bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Available Inventory</h2>
          {loading.inventory ? (
            <div className="text-center">Loading inventory...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {inventory.slice(0, 3).map(item => (
                <div key={item._id} className="p-3 border rounded shadow-sm">
                  <div className="font-semibold">{item.name || `Item ${item.sku}`}</div>
                  <div className="text-sm text-gray-600">
                    SKU: {item.sku} | Qty: {item.quantity} | Bin: {item.bin}
                  </div>
                </div>
              ))}
              {inventory.length > 3 && (
                <div className="p-3 border rounded bg-gray-50 text-center">
                  + {inventory.length - 3} more items
                </div>
              )}
            </div>
          )}
        </div>

        {/* Outbound History Table */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Outbound History</h2>
          {loading.outsets ? (
            <div className="text-center py-4">Loading outbound records...</div>
          ) : outsetItems.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No outbound records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-100 text-left text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Time</th>
                    <th className="px-4 py-2">SKU</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Bin</th>
                    <th className="px-4 py-2">Qty</th>
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-4 py-2">Invoice</th>
                    <th className="px-4 py-2">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {outsetItems.map(item => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{new Date(item.createdAt).toLocaleTimeString()}</td>
                      <td className="px-4 py-2 font-mono">{item.sku}</td>
                      <td className="px-4 py-2">{item.name || `Item ${item.sku}`}</td>
                      <td className="px-4 py-2">{item.bin}</td>
                      <td className="px-4 py-2 text-red-600">-{item.quantity}</td>
                      <td className="px-4 py-2">{item.customerName}</td>
                      <td className="px-4 py-2">{item.invoiceNo}</td>
                      <td className="px-4 py-2">{item.user?.name || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Product Modal */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold mb-4">Select Product</h2>
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search products by SKU, name, or bin..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {(() => {
                  // Filter inventory based on search term
                  const filteredInventory = inventory.filter(product => {
                    if (!searchTerm.trim()) return true;
                    const search = searchTerm.toLowerCase();
                    return (
                      product.sku.toLowerCase().includes(search) ||
                      (product.name && product.name.toLowerCase().includes(search)) ||
                      product.bin.toLowerCase().includes(search)
                    );
                  });

                  if (filteredInventory.length === 0) {
                    return (
                      <div className="text-center text-gray-500 py-8">
                        {searchTerm.trim() ? 'No products found matching your search.' : 'No products available.'}
                      </div>
                    );
                  }

                  return filteredInventory.map(product => (
                    <div
                      key={product._id}
                      onClick={() => handleProductSelect(product)}
                      className="border p-3 rounded-lg mb-2 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                    >
                      <div className="font-medium">{product.name || `Item ${product.sku}`}</div>
                      <div className="text-sm text-gray-600">
                        SKU: {product.sku} | Qty: {product.quantity} | Bin: {product.bin}
                      </div>
                    </div>
                  ));
                })()}
              </div>
              <div className="p-6 border-t">
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setSearchTerm(''); // Clear search when closing modal
                  }}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Outbound Modal */}
        {showOutsetModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
              <h2 className="text-lg font-semibold">Confirm Outbound</h2>
              <div className="bg-gray-100 p-3 rounded">
                <p className="font-semibold">{selectedProduct.name}</p>
                <p className="text-sm text-gray-600">
                  SKU: {selectedProduct.sku} | Bin: {selectedProduct.bin}
                </p>
              </div>
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
                className="w-full border px-3 py-2 rounded"
                placeholder="Quantity"
              />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border px-3 py-2 rounded"
                placeholder="Customer Name"
              />
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full border px-3 py-2 rounded"
                placeholder="Invoice/Reference No"
              />
              <div className="flex justify-between">
                <button
                  onClick={() => {
                    setShowOutsetModal(false);
                    setShowProductModal(true);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmOutset}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {loading.outsets ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}