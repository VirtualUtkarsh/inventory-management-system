import { useState } from 'react';
import axios from 'axios';
import './OutsetPage.css';

const OutsetPage = () => {
  const [sku, setSku] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [bin, setBin] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/outsets', { sku, orderNo, bin, quantity, customerName, invoiceNo });
      setMessage('Outset recorded successfully!');
      setError('');
      setSku('');
      setOrderNo('');
      setBin('');
      setQuantity(1);
      setCustomerName('');
      setInvoiceNo('');
    } catch (err) {
      setError('Failed to record outset');
      setMessage('');
    }
  };

  return (
    <div className="outset-container">
      <h1>Record Outbound Items</h1>
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="sku">SKU</label>
          <input
            id="sku"
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="orderNo">Order Number</label>
          <input
            id="orderNo"
            type="text"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="bin">Bin</label>
          <input
            id="bin"
            type="text"
            value={bin}
            onChange={(e) => setBin(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="customerName">Customer Name</label>
          <input
            id="customerName"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="invoiceNo">Invoice Number</label>
          <input
            id="invoiceNo"
            type="text"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary">Record Outset</button>
      </form>
    </div>
  );
};

export default OutsetPage;
