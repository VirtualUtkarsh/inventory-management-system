// client/src/hooks/useInboundCart.js
import { useState, useCallback } from 'react';

export const useInboundCart = () => {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = useCallback((item) => {
    const newItem = {
      id: `${item.skuId}-${item.bin}-${Date.now()}`,
      skuId: item.skuId.toUpperCase(),
      bin: item.bin.toUpperCase(),
      quantity: Number(item.quantity),
      addedAt: new Date().toISOString()
    };

    setCartItems(prev => [...prev, newItem]);
  }, []);

  const removeFromCart = useCallback((itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setCartItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, quantity: Number(newQuantity) }
        : item
    ));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getCartSummary = useCallback(() => {
    return {
      totalItems: cartItems.length,
      totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      uniqueSkus: [...new Set(cartItems.map(item => item.skuId))].length
    };
  }, [cartItems]);

  return {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartSummary
  };
};
