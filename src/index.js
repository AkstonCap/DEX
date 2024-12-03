import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { listenToWalletData } from 'nexus-module';

import configureStore from './configureStore';
import App from './App';

const store = configureStore();
listenToWalletData(store);

render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);
