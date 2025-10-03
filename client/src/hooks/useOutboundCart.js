// client/src/hooks/useOutboundCart.js
import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

export const useOutboundCart = () => {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = useCallback((product, quantity = 1) => {
    const cartKey = `${product.skuId}-${product.bin}`;
    
    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        item => `${item.skuId}-${item.bin}` === cartKey
      );

      if (existingIndex >= 0) {
        // Item already in cart - update quantity
        const existingItem = prev[existingIndex];
        const newQuantity = existingItem.quantity + quantity;
        
        // Check against original product quantity
        if (newQuantity > existingItem.availableQuantity) {
          toast.error(`Cannot add more than ${existingItem.availableQuantity} items from bin ${product.bin}`);
          return prev; // Return unchanged state
        }
        
        // Create new array with updated item
        const updatedItems = [...prev];
        updatedItems[existingIndex] = {
          ...existingItem,
          quantity: newQuantity
        };
        
        toast.success(`Updated ${product.skuId} quantity to ${newQuantity} in cart`);
        return updatedItems;
      } else {
        // New item - add to cart
        if (quantity > product.quantity) {
          toast.error(`Cannot add more than ${product.quantity} items from bin ${product.bin}`);
          return prev; // Return unchanged state
        }
        
        const newItem = {
          id: cartKey,
          skuId: product.skuId,
          bin: product.bin,
          quantity: quantity,
          availableQuantity: product.quantity,
          name: product.name || product.skuId,
          product: product
        };
        
        toast.success(`Added ${product.skuId} (${quantity}) to cart`);
        return [...prev, newItem];
      }
    });
  }, []);

  const removeFromCart = useCallback((cartId) => {
    setCartItems(prev => prev.filter(item => item.id !== cartId));
    toast.success('Item removed from cart');
  }, []);

  const updateQuantity = useCallback((cartId, newQuantity) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === cartId) {
        if (newQuantity > item.availableQuantity) {
          toast.error(`Cannot exceed available quantity of ${item.availableQuantity}`);
          return item;
        }
        if (newQuantity < 1) {
          toast.error('Quantity must be at least 1');
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    toast.success('Cart cleared');
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