import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const InventoryPage = () => {
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const { data } = await axios.get('/api/inventory');
        setInventory(data);
      } catch (error) {
        toast.error('Failed to load inventory');
      }
    };
    fetchInventory();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Inventory</h1>
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border">SKU</th>
            <th className="py-2 px-4 border">Product Name</th>
            <th className="py-2 px-4 border">Quantity</th>
            <th className="py-2 px-4 border">Bin</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map(item => (
            <tr key={item._id}>
              <td className="py-2 px-4 border">{item.sku}</td>
              <td className="py-2 px-4 border">{item.name}</td>
              <td className="py-2 px-4 border">{item.quantity}</td>
              <td className="py-2 px-4 border">{item.bin}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryPage;
