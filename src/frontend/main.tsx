import React from 'react';
import ReactDOM from 'react-dom/client';
import Router from '../Router';
import '../index.css';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../config/theme';

const rootEl = document.getElementById('root');
if (rootEl) {
    ReactDOM.createRoot(rootEl).render(
        <React.StrictMode>
            <ChakraProvider theme={theme}>
                <Router />
            </ChakraProvider>
        </React.StrictMode>
    );
} else {
    // eslint-disable-next-line no-console
    console.warn('Root element not found');
}
