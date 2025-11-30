import React, { useState } from 'react';
import { X, ShoppingCart, Trash2, Package, Plus, Minus } from 'lucide-react';

export default function InboundCart({ 
  cartItems = [
    { id: 1, skuId: 'TS1156-L-RED-PACK10', bin: 'ST-016-005-006', quantity: 7 },
    { id: 2, skuId: 'TS1157-M-BLUE-PACK5', bin: 'ST-016-005-007', quantity: 3 }
  ], 
  onUpdateQuantity = () => {}, 
  onRemoveItem = () => {}, 
  onClearCart = () => {}, 
  onProcessCart = () => {}, 
  onClose = () => {}, 
  loading = false
}) {
  const handleSubmit = () => {
    if (cartItems.length === 0) {
      return;
    }

    onProcessCart({
      items: cartItems
    });
  };

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueSkus = [...new Set(cartItems.map(item => item.skuId))].length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Inbound Cart</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {cartItems.length} items • {totalQuantity} units • {uniqueSkus} unique SKUs
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

        {/* Cart Items - Scrollable */}
        <div className="overflow-y-auto px-6 py-4 max-h-[50vh]">
          {cartItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">Your inbound cart is empty</p>
              <p className="text-sm text-gray-400 mt-1">Add items using the form above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all p-4"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-indigo-600" />
                      </div>
                    </div>

                    {/* Item Info & Controls */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-base break-all">
                            {item.skuId}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Bin: <span className="font-medium text-gray-900">{item.bin}</span>
                        </p>
                        
                        <div className="flex items-center gap-3">
                          {/* Quantity Controls */}
                          <div className="flex items-center bg-white border-2 border-gray-300 rounded-lg">
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-4 font-bold text-gray-900 text-lg min-w-[3rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                              className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove from cart"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-5 rounded-b-2xl">
          {cartItems.length > 0 && (
            <>
              {/* Summary Stats */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-medium mb-1">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900">{cartItems.length}</p>
                  </div>
                  <div className="text-center border-x border-gray-200">
                    <p className="text-xs text-gray-500 font-medium mb-1">Total Quantity</p>
                    <p className="text-2xl font-bold text-gray-900">{totalQuantity}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-medium mb-1">Unique SKUs</p>
                    <p className="text-2xl font-bold text-gray-900">{uniqueSkus}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center gap-3">
            <button
              type="button"
              onClick={onClearCart}
              disabled={cartItems.length === 0 || loading}
              className="px-5 py-2.5 text-red-600 hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed font-semibold rounded-lg transition-colors"
            >
              Clear
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-semibold transition-colors"
              >
                Cancel
              </button>
<button
  onClick={handleSubmit}
  disabled={cartItems.length === 0 || loading}
  className="
    w-full sm:w-auto 
    px-6 py-3 sm:px-8 
    bg-indigo-600 hover:bg-indigo-700 
    disabled:bg-gray-400 disabled:cursor-not-allowed 
    text-white font-semibold rounded-xl 
    transition-all flex items-center gap-2 
    shadow-lg shadow-indigo-500/30 
    justify-center
  "
>
  {loading ? (
    <>
      <div className="w-5 h-5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      <span className="text-sm sm:text-base">Processing...</span>
    </>
  ) : (
    <>
      <ShoppingCart className="w-4 h-4 sm:w-3 sm:h-3" />
      <span className="text-sm sm:text-base">Done</span>
    </>
  )}
</button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
