// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from '@src/App/App';

// 페이지
import MainLandingPage from '@src/domains/main/areas/home/features/main-landing/pages/MainLandingPage';
import './routes/index.css';

import { sellerRoutes } from '@src/domains/seller/routes';
import { buyerRoutes } from '@src/domains/buyer/routes';
import loginRoutes from '@src/domains/common/auth/routes';
import mainRoutes from '@src/domains/main/routes';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <MainLandingPage /> },
      ...loginRoutes,
      ...mainRoutes,
      ...sellerRoutes,
      ...buyerRoutes,
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
