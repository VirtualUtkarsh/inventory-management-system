import { useState } from 'react';
import axios from '../utils/axiosInstance';
import './InsetPage.css';

const InsetPage = () => {
  const [sku, setSku] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [bin, setBin] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/insets', { sku, orderNo, bin, quantity });
      setMessage('Inset recorded successfully!');
      setError('');
      setSku('');
      setOrderNo('');
      setBin('');
      setQuantity(1);
    } catch (err) {
      setError('Failed to record inset');
      setMessage('');
    }
  };

  return (
    <div className="inset-container">
      <h1>Record Inbound Items</h1>
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
        <button type="submit" className="btn-primary">Record Inset</button>
      </form>
    </div>
  );
};

export default InsetPage;
