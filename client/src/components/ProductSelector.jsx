// client/src/components/ProductSelector.jsx
import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  Search,
  Package,
  MapPin,
  Plus,
  X,
  RefreshCw,
  Check,
  ShoppingCart,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// ✅ Debounced search hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const ITEMS_PER_PAGE = 50; // Show 50 SKUs per page

const ProductSelector = ({ 
  inventory, 
  cartItems = [],
  onAddToCart, 
  onClose, 
  loading = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebounce(searchTerm, 300);

  // ✅ Memoize cart lookup map (O(1) access)
  const cartMap = useMemo(() => {
    const map = new Map();
    cartItems.forEach(item => {
      const key = `${item.skuId}-${item.bin}`;
      map.set(key, item.quantity);
    });
    return map;
  }, [cartItems]);

  const getQuantityInCart = useCallback((product) => {
    return cartMap.get(`${product.skuId}-${product.bin}`) || 0;
  }, [cartMap]);

  // ✅ Memoize grouped inventory
  const groupedInventory = useMemo(() => {
    const grouped = {};
    inventory.forEach(item => {
      const sku = item.skuId || item.sku || 'N/A';
      if (!grouped[sku]) {
        grouped[sku] = [];
      }
      grouped[sku].push(item);
    });
    return grouped;
  }, [inventory]);

  // ✅ Memoize filtered results
  const filteredInventory = useMemo(() => {
    if (!debouncedSearch.trim()) return groupedInventory;

    const search = debouncedSearch.toLowerCase();
    const filtered = {};

    Object.entries(groupedInventory).forEach(([sku, products]) => {
      const skuMatch = sku.toLowerCase().includes(search);
      const productsMatch = products.some(item => 
        item.bin.toLowerCase().includes(search) ||
        (item.name && item.name.toLowerCase().includes(search))
      );

      if (skuMatch || productsMatch) {
        filtered[sku] = products;
      }
    });

    return filtered;
  }, [groupedInventory, debouncedSearch]);

  // ✅ Pagination logic
  const { paginatedItems, totalPages } = useMemo(() => {
    const entries = Object.entries(filteredInventory);
    const total = Math.ceil(entries.length / ITEMS_PER_PAGE);
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginated = entries.slice(start, end);
    
    return {
      paginatedItems: Object.fromEntries(paginated),
      totalPages: total
    };
  }, [filteredInventory, currentPage]);

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const hasResults = Object.keys(filteredInventory).length > 0;
  const totalItems = Object.keys(filteredInventory).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Select Products</h2>
              <p className="text-sm text-gray-600 mt-1">
                {totalItems} product{totalItems !== 1 ? 's' : ''} available
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by SKU, product name, or bin location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        {/* Product List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Loading products...</p>
            </div>
          ) : !hasResults ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm.trim() ? 'No products found' : 'No products available'}
              </h3>
              <p className="text-gray-500">
                {searchTerm.trim() 
                  ? 'Try adjusting your search terms' 
                  : 'Add inventory items to get started'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(paginatedItems).map(([sku, products]) => (
                <SkuGroup
                  key={sku}
                  sku={sku}
                  products={products}
                  getQuantityInCart={getQuantityInCart}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {hasResults && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <span className="text-sm text-gray-700 px-4">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {cartItems.length > 0 && `${cartItems.length} item(s) in cart`}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              Done Selecting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ Memoized SKU Group
const SkuGroup = memo(({ sku, products, getQuantityInCart, onAddToCart }) => {
  const totalQuantity = useMemo(() => 
    products.reduce((sum, p) => sum + p.quantity, 0),
    [products]
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="w-5 h-5 text-gray-600 mr-3" />
            <div>
              <h3 className="font-semibold text-gray-900">SKU: {sku}</h3>
              <p className="text-sm text-gray-600">
                Available in {products.length} bin{products.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Total: {totalQuantity} units
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map(product => (
            <ProductBinCard
              key={product._id}
              product={product}
              quantityInCart={getQuantityInCart(product)}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

// ✅ Memoized Product Card
const ProductBinCard = memo(({ product, quantityInCart = 0, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const remainingQuantity = product.quantity - quantityInCart;
  const isFullyInCart = remainingQuantity <= 0;

  const handleAdd = useCallback(async () => {
    setIsAdding(true);
    try {
      await onAddToCart(product, quantity);
      setQuantity(1);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } finally {
      setIsAdding(false);
    }
  }, [onAddToCart, product, quantity]);

  const handleQuantityChange = useCallback((e) => {
    const value = Math.max(1, Math.min(Number(e.target.value), remainingQuantity));
    setQuantity(value);
  }, [remainingQuantity]);

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      isFullyInCart 
        ? 'border-gray-200 bg-gray-50 opacity-75' 
        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
    }`}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 text-gray-500 mr-2" />
            <span className="font-mono text-sm font-medium text-blue-600">
              {product.bin}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              {remainingQuantity} available
            </div>
            {quantityInCart > 0 && (
              <div className="text-xs text-purple-600 flex items-center justify-end mt-1">
                <ShoppingCart className="w-3 h-3 mr-1" />
                {quantityInCart} in cart
              </div>
            )}
          </div>
        </div>

        {product.name && (
          <div className="text-sm text-gray-700">
            {product.name}
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          {product.size && <div>Size: {product.size}</div>}
          {product.color && <div>Color: {product.color}</div>}
          {product.category && <div>Category: {product.category}</div>}
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <div className="flex-1">
            <input
              type="number"
              min="1"
              max={remainingQuantity}
              value={quantity}
              onChange={handleQuantityChange}
              disabled={isFullyInCart}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Qty"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={isAdding || isFullyInCart}
            className={`flex-shrink-0 px-3 py-1 text-white text-sm font-medium rounded transition-all flex items-center ${
              isFullyInCart
                ? 'bg-gray-400 cursor-not-allowed'
                : justAdded 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700' 
            }`}
          >
            {isAdding ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : isFullyInCart ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                In Cart
              </>
            ) : justAdded ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                Added
              </>
            ) : quantityInCart > 0 ? (
              <>
                <Plus className="w-3 h-3 mr-1" />
                Add More
              </>
            ) : (
              <>
                <Plus className="w-3 h-3 mr-1" />
                Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

SkuGroup.displayName = 'SkuGroup';
ProductBinCard.displayName = 'ProductBinCard';

export default memo(ProductSelector);
