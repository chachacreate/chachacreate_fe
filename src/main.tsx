// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import App from '@src/App/App';

// 페이지
import './routes/index.css';

import { sellerRoutes } from '@src/domains/seller/routes';
import { buyerRoutes } from '@src/domains/buyer/routes';
import loginRoutes from '@src/domains/common/auth/routes';
import mainRoutes from '@src/domains/main/routes';
import NotFoundPage from './shared/areas/error/NotFoundPage';
import { errorRoutes } from './shared/areas/error/routes';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/main" replace /> },
      ...loginRoutes,
      ...mainRoutes,
      ...sellerRoutes,
      ...buyerRoutes,
      ...errorRoutes,
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
