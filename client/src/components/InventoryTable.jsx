export default function InventoryTable({ inventory }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Current Inventory</h3>
      <table className="min-w-full table-auto border-collapse text-sm">
        <thead className="bg-gray-100 text-gray-600 uppercase text-left tracking-wider">
          <tr>
            <th className="px-4 py-3 min-w-[120px]">SKU</th>
            <th className="px-4 py-3 min-w-[180px]">Name</th>
            <th className="px-4 py-3 min-w-[100px]">Quantity</th>
            <th className="px-4 py-3 min-w-[100px]">Bin</th>
            <th className="px-4 py-3 min-w-[180px]">Last Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {inventory.map((item) => (
            <tr key={item._id} className="hover:bg-gray-50">
              <td className="px-4 py-2 font-mono text-gray-900">{item.sku}</td>
              <td className="px-4 py-2 break-words">{item.name || `Item ${item.sku}`}</td>
              <td className="px-4 py-2 text-blue-600 font-semibold">{item.quantity}</td>
              <td className="px-4 py-2">{item.bin}</td>
              <td className="px-4 py-2 text-gray-500">
                {new Date(item.lastUpdated).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
