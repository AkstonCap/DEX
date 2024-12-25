import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { 
  FieldSet,
  Button,
  Dropdown,
  TextField,
  Select,
 } from 'nexus-module';
import { createOrder, executeOrder, cancelOrder } from '../actions/placeOrder';

export default function TradeForm() {
  const [orderType, setOrderType] = useState('buy');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const dispatch = useDispatch();

  const handleSubmit = (e) => {
    e.preventDefault();
    //dispatch(placeOrder(orderType, price, amount));
  };

  return (
    <div className="mt2">
      <h3>Place Order</h3>
      <form onSubmit={handleSubmit}>
        <label>
          Order Type:
          <Select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
            <option value="bid">Buy</option>
            <option value="ask">Sell</option>
          </Select>
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
        <Button onclick={handleSubmit}>
          Create Order
        </Button>
      </form>
    </div>
  );
}