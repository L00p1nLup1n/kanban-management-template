import React from 'react';
import ReactDOM from 'react-dom/client';
import Router from '../Router';
import '../index.css';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../config/theme';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ChakraProvider theme={theme}>
            <Router />
        </ChakraProvider>
    </React.StrictMode>
);
