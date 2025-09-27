// client/src/hooks/useOutboundCart.js
import { useState } from 'react';
import { toast } from 'react-toastify';

export const useOutboundCart = () => {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (product, quantity = 1) => {
    const cartKey = `${product.skuId}-${product.bin}`;
    
    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        item => `${item.skuId}-${item.bin}` === cartKey
      );

      if (existingIndex >= 0) {
        const updatedItems = [...prev];
        const newQuantity = updatedItems[existingIndex].quantity + quantity;
        
        if (newQuantity > product.quantity) {
          toast.error(`Cannot add more than ${product.quantity} items from bin ${product.bin}`);
          return prev;
        }
        
        updatedItems[existingIndex].quantity = newQuantity;
        toast.success(`Updated ${product.skuId} quantity in cart`);
        return updatedItems;
      } else {
        if (quantity > product.quantity) {
          toast.error(`Cannot add more than ${product.quantity} items from bin ${product.bin}`);
          return prev;
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
        
        toast.success(`Added ${product.skuId} to cart`);
        return [...prev, newItem];
      }
    });
  };

  const removeFromCart = (cartId) => {
    setCartItems(prev => prev.filter(item => item.id !== cartId));
    toast.success('Item removed from cart');
  };

  const updateQuantity = (cartId, newQuantity) => {
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
  };

  const clearCart = () => {
    setCartItems([]);
    toast.success('Cart cleared');
  };

  const getCartSummary = () => {
    const totalItems = cartItems.length;
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueSkus = [...new Set(cartItems.map(item => item.skuId))].length;
    
    return { totalItems, totalQuantity, uniqueSkus };
  };

  return {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartSummary
  };
};