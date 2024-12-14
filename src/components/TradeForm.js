import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { placeOrder } from '../actions/placeOrder';

export default function TradeForm() {
  const [orderType, setOrderType] = useState('buy');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const dispatch = useDispatch();

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(placeOrder(orderType, price, amount));
  };

  return (
    <div className="trade-form">
      <h3>Place Order</h3>
      <form onSubmit={handleSubmit}>
        <label>
          Order Type:
          <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </label>
        <label>
          Price:
          <input
            type="number"
            step="0.0001"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label>
          Amount:
          <input
            type="number"
            step="0.0001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <button type="submit">Submit Order</button>
      </form>
    </div>
  );
}