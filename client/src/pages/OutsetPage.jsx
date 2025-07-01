import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function OutsetPage() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showOutsetModal, setShowOutsetModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [outsetItems, setOutsetItems] = useState([]);

  // Fetch inventory data
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const { data } = await axios.get('/api/inventory');
        setInventory(data.filter(item => item.quantity > 0));
      } catch (error) {
        toast.error('Failed to load inventory');
      }
    };
    fetchInventory();
  }, []);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setShowProductModal(false);
    setShowOutsetModal(true);
  };

  const handleConfirmOutset = async () => {
    if (!selectedProduct || !customerName || !invoiceNo) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const { data } = await axios.post('/api/outset', {
        sku: selectedProduct.sku,
        quantity: parseInt(quantity),
        customerName,
        invoiceNo,
        userId: user.id,
        userName: user.name,
        bin: selectedProduct.bin
      });

      // Update local state
      setOutsetItems(prev => [data, ...prev]);
      
      // Refresh inventory
      const { data: updatedInventory } = await axios.get('/api/inventory');
      setInventory(updatedInventory.filter(item => item.quantity > 0));

      // Reset form
      setSelectedProduct(null);
      setCustomerName('');
      setInvoiceNo('');
      setShowOutsetModal(false);
      
      toast.success('Outbound item recorded successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record outbound');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Outbound Items</h1>
      
      {/* Add Outset Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowProductModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Add Outbound Item
        </button>
      </div>

      {/* Outset Items Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border">SKU</th>
              <th className="py-2 px-4 border">Product</th>
              <th className="py-2 px-4 border">Quantity</th>
              <th className="py-2 px-4 border">Bin</th>
              <th className="py-2 px-4 border">Customer</th>
              <th className="py-2 px-4 border">Invoice</th>
              <th className="py-2 px-4 border">Date</th>
            </tr>
          </thead>
          <tbody>
            {outsetItems.map(item => (
              <tr key={item._id}>
                <td className="py-2 px-4 border">{item.sku}</td>
                <td className="py-2 px-4 border">{item.name || `Item ${item.sku}`}</td>
                <td className="py-2 px-4 border">{item.quantity}</td>
                <td className="py-2 px-4 border">{item.bin}</td>
                <td className="py-2 px-4 border">{item.customerName}</td>
                <td className="py-2 px-4 border">{item.invoiceNo}</td>
                <td className="py-2 px-4 border">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Select Product</h3>
            
            <div className="mb-4 space-y-2 max-h-96 overflow-y-auto">
              {inventory.map(product => (
                <div 
                  key={product._id} 
                  onClick={() => handleProductSelect(product)}
                  className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <div className="font-medium">{product.name || `Item ${product.sku}`}</div>
                  <div className="text-sm text-gray-600">
                    SKU: {product.sku} | Qty: {product.quantity} | Bin: {product.bin}
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => setShowProductModal(false)}
              className="mt-4 px-4 py-2 bg-gray-200 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Outset Details Modal */}
      {showOutsetModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Outbound Details</h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <div className="font-medium">{selectedProduct.name || `Item ${selectedProduct.sku}`}</div>
              <div className="text-sm text-gray-600">
                SKU: {selectedProduct.sku} | Available: {selectedProduct.quantity} | Bin: {selectedProduct.bin}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block mb-1 font-medium">Quantity (Max: {selectedProduct.quantity})</label>
              <input
                type="number"
                min="1"
                max={selectedProduct.quantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.min(Number(e.target.value), selectedProduct.quantity))}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-1 font-medium">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block mb-1 font-medium">Invoice Number</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setShowOutsetModal(false);
                  setShowProductModal(true);
                }}
                className="px-4 py-2 bg-gray-200 rounded-md"
              >
                Back
              </button>
              <button 
                onClick={handleConfirmOutset}
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
              >
                Confirm Outbound
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
