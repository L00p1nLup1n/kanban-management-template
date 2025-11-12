import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ChakraProvider } from '@chakra-ui/react';
import theme from './config/theme';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ChakraProvider theme={theme}>
        <App />
      </ChakraProvider>
    </React.StrictMode>,
  );
} else {
  // fallback: log a helpful message during dev
  // (keeps tsc happy by avoiding non-null assertion)
  // eslint-disable-next-line no-console
  console.warn('Root element not found');
}
