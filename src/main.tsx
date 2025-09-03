// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from '@src/App/App';

// 페이지
import MainLandingPage from '@src/domains/main/areas/home/features/main-landing/pages/MainLandingPage';
import MainClassesPage from '@src/domains/main/areas/home/features/main-landing/pages/MainClassesPage';
import ClassesDetailPage from '@src/domains/main/areas/home/features/class-detail/pages/ClassesDetailPage';
import MainStorePage from '@src/domains/main/areas/home/features/main-landing/pages/MainStorePage';
import StoreClassesPage from '@src/domains/buyer/areas/classes/pages/StoreClassesPage';
import MainClassOrderPage from '@src/domains/main/areas/home/features/class-order/pages/MainClassOrderPage';
import MainClassOrderResultPage from '@src/domains/main/areas/home/features/class-order/pages/MainClassOrderResultPage';
import MainMypagePage from '@src/domains/main/areas/mypage/pages/MainMypagePage';
import MainMypageClassesPage from '@src/domains/main/areas/mypage/pages/MainMypageclasses';
import './routes/index.css';

import { sellerRoutes } from '@src/domains/seller/routes';
import { buyerRoutes } from './domains/buyer/routes';
import loginRoutes from './domains/common/auth/routes';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      ...loginRoutes,
      { index: true, element: <MainLandingPage /> },
      { path: 'main', element: <MainLandingPage /> },
      { path: 'main/classes', element: <MainClassesPage /> },
      { path: 'main/classes/:classId', element: <ClassesDetailPage /> },
      { path: 'main/stores', element: <MainStorePage /> },
      { path: ':store/classes', element: <StoreClassesPage /> },
      { path: 'main/classes/order', element: <MainClassOrderPage /> },
      { path: 'main/classes/order/result', element: <MainClassOrderResultPage /> },

      { path: 'main/mypage', element: <MainMypagePage /> },
      { path: 'main/mypage/classes', element: <MainMypageClassesPage /> },
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
