import React, { useState } from 'react';
import {
  ShoppingCart,
  X,
  Trash2,
  Edit2,
  Check,
  Package,
  MapPin,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

const OutboundCart = ({ 
  cartItems, 
  onUpdateQuantity, 
  onRemoveItem, 
  onClearCart, 
  onProcessCart, 
  onClose,
  loading = false 
}) => {
  const [customerName, setCustomerName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);

  const cartSummary = {
    totalItems: cartItems.length,
    totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    uniqueSkus: [...new Set(cartItems.map(item => item.skuId))].length
  };

  const handleQuantityEdit = (itemId, newQuantity) => {
    onUpdateQuantity(itemId, newQuantity);
    setEditingItemId(null);
  };

  const handleProcessCart = () => {
    if (!customerName.trim() || !invoiceNo.trim()) {
      return;
    }

    onProcessCart({
      items: cartItems.map(item => ({
        skuId: item.skuId,
        bin: item.bin,
        quantity: item.quantity
      })),
      customerName: customerName.trim(),
      invoiceNo: invoiceNo.trim()
    });
  };

  const canProcess = cartItems.length > 0 && customerName.trim() && invoiceNo.trim() && !loading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ShoppingCart className="w-6 h-6 text-blue-600 mr-3 -mt-6" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Outbound Cart ({cartItems.length})
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Review items and complete outbound
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cart Content */}
        <div className="flex-1 overflow-y-auto">
          {cartItems.length === 0 ? (
            <EmptyCart />
          ) : (
            <div className="p-6">
              {/* Customer Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-blue-900 mb-3">
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter customer name"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">
                      Invoice/Reference No *
                    </label>
                    <input
                      type="text"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter invoice number"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Cart Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">
                    Items ({cartItems.length})
                  </h3>
                  {cartItems.length > 0 && (
                    <button
                      onClick={onClearCart}
                      disabled={loading}
                      className="text-sm text-red-600 hover:text-red-800 disabled:text-red-400 font-medium transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {cartItems.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    isEditing={editingItemId === item.id}
                    onEdit={() => setEditingItemId(item.id)}
                    onCancelEdit={() => setEditingItemId(null)}
                    onUpdateQuantity={(quantity) => handleQuantityEdit(item.id, quantity)}
                    onRemove={() => onRemoveItem(item.id)}
                    disabled={loading}
                  />
                ))}
              </div>

              {/* Cart Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Order Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {cartSummary.totalItems}
                    </div>
                    <div className="text-gray-600">Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {cartSummary.totalQuantity}
                    </div>
                    <div className="text-gray-600">Total Qty</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {cartSummary.uniqueSkus}
                    </div>
                    <div className="text-gray-600">Unique SKUs</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {!customerName.trim() || !invoiceNo.trim() ? (
                  <div className="flex items-center text-amber-600">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Complete customer information to proceed
                  </div>
                ) : (
                  <div className="text-green-600">
                    Ready to process {cartSummary.totalItems} items
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors"
                >
                  Close
                </button>
                
                <button
                  onClick={handleProcessCart}
                  disabled={!canProcess}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Process Outbound
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CartItem = ({ 
  item, 
  isEditing, 
  onEdit, 
  onCancelEdit, 
  onUpdateQuantity, 
  onRemove,
  disabled = false 
}) => {
  const [editQuantity, setEditQuantity] = useState(item.quantity);

  const handleConfirmEdit = () => {
    if (editQuantity !== item.quantity) {
      onUpdateQuantity(editQuantity);
    } else {
      onCancelEdit();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleConfirmEdit();
    } else if (e.key === 'Escape') {
      setEditQuantity(item.quantity);
      onCancelEdit();
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex-1">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <Package className="w-4 h-4 text-blue-600 mr-2" />
            <span className="font-mono text-sm font-medium text-blue-600">
              {item.skuId}
            </span>
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 text-gray-500 mr-1" />
            <span className="text-sm text-gray-600">{item.bin}</span>
          </div>
        </div>
        
        {item.name && item.name !== item.skuId && (
          <div className="text-sm text-gray-700 mt-1">{item.name}</div>
        )}
        
        <div className="text-xs text-gray-500 mt-1">
          Available: {item.availableQuantity} units
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Quantity */}
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <div className="flex items-center space-x-1">
              <input
                type="number"
                min="1"
                max={item.availableQuantity}
                value={editQuantity}
                onChange={(e) => setEditQuantity(Number(e.target.value))}
                onKeyDown={handleKeyPress}
                className="w-16 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500"
                autoFocus
                disabled={disabled}
              />
              <button
                onClick={handleConfirmEdit}
                disabled={disabled}
                className="p-1 text-green-600 hover:bg-green-100 disabled:text-green-400 rounded transition-colors -mt-3"
              >
                <Check className="w-7 h-7" />
              </button>
              <button
                onClick={() => {
                  setEditQuantity(item.quantity);
                  onCancelEdit();
                }}
                disabled={disabled}
                className="p-1 text-red-500 hover:bg-red-100 disabled:text-gray-400 rounded transition-colors -mt-3"
              >
                <X className="w-7 h-7" />
              </button>
            </div>
          ) : (
            <button
              onClick={onEdit}
              disabled={disabled}
              className="flex items-center space-x-1 px-3 py-2 text-base font-medium text-gray-700 bg-gray-100 hover:bg-gray-300 disabled:bg-gray-50 disabled:text-gray-400 rounded transition-colors"
            >
              <span>Qty: {item.quantity}</span>
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          disabled={disabled}
          className="p-2 text-red-600 hover:bg-red-100 disabled:text-red-400 disabled:hover:bg-transparent rounded transition-colors"
          title="Remove from cart"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const EmptyCart = () => (
  <div className="flex flex-col items-center justify-center h-64 text-center">
    <ShoppingCart className="w-16 h-16 text-gray-400 mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
    <p className="text-gray-500 max-w-sm">
      Browse products and add items to your cart to create an outbound record.
    </p>
  </div>
);

export default OutboundCart;