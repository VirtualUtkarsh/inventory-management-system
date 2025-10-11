import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

export const useInboundCart = () => {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = useCallback((item) => {
    const { skuId, bin, quantity } = item;
    const cartKey = `${skuId}-${bin}`;
    
    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        cartItem => `${cartItem.skuId}-${cartItem.bin}` === cartKey
      );

      if (existingIndex >= 0) {
        // Update existing item
        const existingItem = prev[existingIndex];
        const updatedItems = [...prev];
        updatedItems[existingIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + quantity
        };
        
        toast.success(`Updated ${skuId} quantity in cart`);
        return updatedItems;
      } else {
        // Add new item
        const newItem = {
          id: cartKey,
          skuId: skuId.trim().toUpperCase(),
          bin: bin.trim().toUpperCase(),
          quantity: Number(quantity)
        };
        
        toast.success(`Added ${skuId} to inbound cart`);
        return [...prev, newItem];
      }
    });
  }, []);

  const removeFromCart = useCallback((cartId) => {
    setCartItems(prev => prev.filter(item => item.id !== cartId));
    toast.success('Item removed from cart');
  }, []);

  const updateQuantity = useCallback((cartId, newQuantity) => {
    if (newQuantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }
    
    setCartItems(prev => prev.map(item => {
      if (item.id === cartId) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getCartSummary = useCallback(() => {
    const totalItems = cartItems.length;
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueSkus = [...new Set(cartItems.map(item => item.skuId))].length;
    
    return { totalItems, totalQuantity, uniqueSkus };
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