// src/domains/main/routes.ts
import React from 'react';
import type { RouteObject } from 'react-router-dom';

import MainLandingPage from '@src/domains/main/areas/home/features/main-landing/pages/MainLandingPage';
import MainClassesPage from '@src/domains/main/areas/home/features/main-landing/pages/MainClassesPage';
import ClassesDetailPage from '@src/domains/main/areas/home/features/class-detail/pages/ClassesDetailPage';
import MainStorePage from '@src/domains/main/areas/home/features/main-landing/pages/MainStorePage';
import MainClassOrderPage from '@src/domains/main/areas/home/features/class-order/pages/MainClassOrderPage';
import MainClassOrderResultPage from '@src/domains/main/areas/home/features/class-order/pages/MainClassOrderResultPage';
import MainMypagePage from '@src/domains/main/areas/mypage/pages/MainMypagePage';
import MainMypageClassesPage from '@src/domains/main/areas/mypage/pages/MainMypageclasses';

// ✅ products 라우트 추가
import { productsRoutes } from '@src/domains/main/areas/home/features/products/routes';

const mainRoutes: RouteObject[] = [
  {
    path: 'main',
    children: [
      { index: true, element: React.createElement(MainLandingPage) },

      // classes
      { path: 'classes', element: React.createElement(MainClassesPage) },
      { path: 'classes/:classId', element: React.createElement(ClassesDetailPage) },
      { path: 'classes/order', element: React.createElement(MainClassOrderPage) },
      { path: 'classes/order/result', element: React.createElement(MainClassOrderResultPage) },

      // stores
      { path: 'stores', element: React.createElement(MainStorePage) },

      // mypage
      { path: 'mypage', element: React.createElement(MainMypagePage) },
      { path: 'mypage/classes', element: React.createElement(MainMypageClassesPage) },

      // ✅ products (스프레드로 합침)
      ...productsRoutes,
    ],
  },
];

export default mainRoutes;
