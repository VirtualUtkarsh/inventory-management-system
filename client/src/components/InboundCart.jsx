// client/src/components/InboundCart.jsx - NEW FILE
import React, { useState } from 'react';
import { X, ShoppingCart, Trash2, Package, Plus, Minus } from 'lucide-react';

export default function InboundCart({ 
  cartItems, 
  onUpdateQuantity, 
  onRemoveItem, 
  onClearCart, 
  onProcessCart, 
  onClose, 
  loading 
}) {
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (cartItems.length === 0) {
      return;
    }

    onProcessCart({
      items: cartItems,
      notes: notes.trim()
    });
  };

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueSkus = [...new Set(cartItems.map(item => item.skuId))].length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Inbound Cart</h2>
              <p className="text-sm text-gray-600">
                {cartItems.length} items • {totalQuantity} units • {uniqueSkus} unique SKUs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Your inbound cart is empty</p>
              <p className="text-sm text-gray-400 mt-2">Add items using the form above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{item.skuId}</p>
                        <p className="text-sm text-gray-600">Bin: {item.bin}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-3 font-semibold text-gray-900 min-w-[3rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove from cart"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-6 bg-gray-50">
          {cartItems.length > 0 && (
            <>
              {/* Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this inbound batch..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Items</p>
                    <p className="text-lg font-bold text-gray-900">{cartItems.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Quantity</p>
                    <p className="text-lg font-bold text-gray-900">{totalQuantity}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Unique SKUs</p>
                    <p className="text-lg font-bold text-gray-900">{uniqueSkus}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={onClearCart}
              disabled={cartItems.length === 0 || loading}
              className="px-4 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium rounded-lg transition-colors"
            >
              Clear Cart
            </button>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={cartItems.length === 0 || loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Process Inbound ({cartItems.length} items)
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}