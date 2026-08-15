import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import Storefront from './Storefront.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.pathname === '/manage' || window.location.pathname.startsWith('/manage/') ? <App /> : <Storefront />}
  </StrictMode>,
);
