// Mock for nexus-module.
// The real package exposes named exports pulled off `global.NEXUS`, so the mock
// has to provide named exports too - a default-only mock left every
// `import { apiCall } from 'nexus-module'` undefined.
const noopComponent = () => null;

export const FieldSet = noopComponent;
export const Button = noopComponent;
export const TextField = noopComponent;
export const Select = noopComponent;
export const FormField = noopComponent;
export const Modal = noopComponent;
export const Panel = noopComponent;
export const HorizontalTab = noopComponent;
export const Icon = noopComponent;
export const Tooltip = { Trigger: noopComponent };
export const ModuleWrapper = noopComponent;

export const apiCall = jest.fn();
export const secureApiCall = jest.fn();
export const showErrorDialog = jest.fn();
export const showSuccessDialog = jest.fn();
export const showInfoDialog = jest.fn();
export const showNotification = jest.fn();

export const INITIALIZE = '@@NWM/INITIALIZE';
export const UPDATE_WALLET_DATA = '@@NWM/UPDATE_WALLET_DATA';
export const listenToWalletData = jest.fn();
export const stateMiddleware = jest.fn(() => () => (next) => (action) => next(action));
export const storageMiddleware = jest.fn(() => () => (next) => (action) => next(action));
export const walletDataReducer = (state = { initialized: false }) => state;

export default {
  apiCall,
  secureApiCall,
  showErrorDialog,
  showSuccessDialog,
};
