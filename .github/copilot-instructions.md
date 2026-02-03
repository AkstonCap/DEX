# Copilot Instructions for DEX Project

This DEX (Decentralized Exchange) module runs inside the Nexus Wallet Interface and interacts with the Nexus blockchain. Understanding the API system is critical for correct implementation.

## Nexus Wallet Module API System

This module runs inside the NexusInterface wallet as a WebView. Communication with the wallet and blockchain happens through the `NEXUS` global variable, which provides utilities for API calls, dialogs, and more.

### API Call Types: `apiCall` vs `secureApiCall`

The Nexus module system provides two types of API calls:

#### `apiCall` - For Read-Only Operations

Use `apiCall` for operations that **do not modify the sigchain** (read-only queries):

```javascript
import { apiCall } from 'nexus-module';

// Examples of READ-ONLY operations (use apiCall):
await apiCall('market/list/order', { market: 'TOKEN/NXS' });
await apiCall('market/list/executed', { market: 'TOKEN/NXS' });
await apiCall('assets/get/raw', { name: 'my-asset' });
await apiCall('register/list/finance:token', { limit: 100 });
await apiCall('finance/list/accounts');
await apiCall('system/get/info');
```

#### `secureApiCall` - For Write Operations (Requires PIN)

Use `secureApiCall` for operations that **modify the sigchain** (create, update, transfer, etc.). These operations require the user's PIN and will display a confirmation modal:

```javascript
import { secureApiCall } from 'nexus-module';

// Examples of WRITE operations (use secureApiCall):
await secureApiCall('market/create/bid', { market, amount, price, from, to });
await secureApiCall('market/create/ask', { market, amount, price, from, to });
await secureApiCall('market/execute/order', { txid, from, to });
await secureApiCall('market/cancel/order', { txid });
await secureApiCall('assets/create/raw', { name, format: 'raw', data });
await secureApiCall('assets/update/raw', { name, format: 'raw', data });
await secureApiCall('finance/debit/account', { address, name_to, amount });
```

**Rule of thumb:** If the operation requires a `pin` parameter in the API docs, use `secureApiCall`.

### API Operations Reference

| Operation Type | API Endpoint | Use |
|---------------|--------------|-----|
| **Read** | `market/list/*` | `apiCall` |
| **Read** | `assets/get/*` | `apiCall` |
| **Read** | `register/list/*` | `apiCall` |
| **Read** | `finance/list/*` | `apiCall` |
| **Write** | `market/create/*` | `secureApiCall` |
| **Write** | `market/execute/*` | `secureApiCall` |
| **Write** | `market/cancel/*` | `secureApiCall` |
| **Write** | `assets/create/*` | `secureApiCall` |
| **Write** | `assets/update/*` | `secureApiCall` |
| **Write** | `assets/transfer/*` | `secureApiCall` |
| **Write** | `finance/debit/*` | `secureApiCall` |
| **Write** | `finance/credit/*` | `secureApiCall` |

### User Cancellation Handling

When using `secureApiCall`, the user can cancel the PIN entry modal. Always handle this case:

```javascript
try {
  const result = await secureApiCall('market/create/bid', params);
  if (result) {
    // Success
  }
} catch (error) {
  // Could be user cancelled OR actual API error
  if (error?.message?.includes('cancelled')) {
    // User cancelled - no error dialog needed
    return null;
  }
  dispatch(showErrorDialog({
    message: 'Operation failed',
    note: error?.message || 'Unknown error',
  }));
}
```

---

## Nexus Blockchain API - Important Notes

### Price Calculation

**NEVER use the `price` field from trade/order data.** There is a known bug in the Nexus core that causes incorrect price values to be returned.

Instead, always calculate the price manually from `contract.amount` and `order.amount`:

```javascript
// For bid orders (buying base token with quote token):
// contract.amount = quote token amount (what user pays)
// order.amount = base token amount (what user gets)
price = contractAmount / orderAmount;

// For ask orders (selling base token for quote token):
// contract.amount = base token amount (what user sells)
// order.amount = quote token amount (what user gets)
price = orderAmount / contractAmount;
```

### NXS Divisible Units

**NXS amounts are ALWAYS returned in divisible units** (the actual amount multiplied by 1e6). This applies ONLY to NXS, not other tokens.

When processing amounts, always check if the token is NXS and convert accordingly:

```javascript
let orderAmount = parseFloat(trade.order.amount);
let contractAmount = parseFloat(trade.contract.amount);

// Convert NXS from divisible units
if (trade.order.ticker === 'NXS') {
  orderAmount = orderAmount / 1e6;
}
if (trade.contract.ticker === 'NXS') {
  contractAmount = contractAmount / 1e6;
}
```

### API Call Safety

Always validate that required parameters (like `market`, `marketPair`) are valid strings before making API calls:

```javascript
if (!marketPair || typeof marketPair !== 'string') {
  return; // Don't make the API call
}
```

### Asset Storage Format

When storing data in raw assets (like the watchlist), use JSON strings:

```javascript
// Create asset with JSON data
await secureApiCall('assets/create/raw', {
  name: 'my-asset-name',
  format: 'raw',
  data: JSON.stringify(['item1', 'item2']),
});

// Read and parse asset data
const asset = await apiCall('assets/get/raw', { name: 'my-asset-name' });
if (asset && asset.data) {
  const data = JSON.parse(asset.data);
}
```

---

## React Best Practices

### Switch Statement Scoping

When using `const` or `let` inside `switch` case blocks, always wrap the case in curly braces to create proper block scope:

```javascript
switch (value) {
  case 'option1': {
    const myVar = 'something';
    return myVar;
  }
  case 'option2': {
    const myVar = 'other'; // This is fine because it's in a separate block
    return myVar;
  }
  default:
    return null;
}
```

### Avoid Mutating Objects in Map

Don't mutate original objects inside `.map()` callbacks. Create new values instead:

```javascript
// BAD - mutates original trade object
historicalData.map(trade => {
  trade.order.amount = trade.order.amount / 1e6; // Mutates original!
  return trade;
});

// GOOD - creates new calculated values
historicalData.map(trade => {
  const orderAmount = parseFloat(trade.order.amount) / 1e6;
  return {
    ...trade,
    calculatedAmount: orderAmount
  };
});
```

---

## Module Architecture

### Available NEXUS Utilities

The `NEXUS` global variable provides these utilities (import from `nexus-module`):

```javascript
import {
  // API Calls
  apiCall,           // Read-only blockchain API calls
  secureApiCall,     // Write operations (requires PIN)
  
  // Dialogs
  showNotification,  // Toast notification
  showErrorDialog,   // Error modal
  showSuccessDialog, // Success modal
  showInfoDialog,    // Info modal
  confirm,           // Yes/No confirmation dialog
  
  // Components (re-exported from NEXUS.components)
  Button,
  TextField,
  FieldSet,
  Panel,
  Tooltip,
  // ... and more
} from 'nexus-module';
```

### State Persistence

- Use Redux for application state
- Use `updateStorage` for persistent settings (saved to disk)
- Use `updateState` for session state (lost on navigation away)

See [Nexus API docs/Modules/nexus-global-variable.md](../Nexus%20API%20docs/Modules/nexus-global-variable.md) for complete documentation.
