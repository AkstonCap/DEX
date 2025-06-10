import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { listenToWalletData } from 'nexus-module';

import configureStore from './configureStore';
import App from './App';

const store = configureStore();
listenToWalletData(store);

const root = createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
