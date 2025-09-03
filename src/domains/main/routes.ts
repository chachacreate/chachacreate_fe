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

const mainRoutes: RouteObject[] = [
  {
    path: 'main',
    children: [
      { index: true, element: React.createElement(MainLandingPage) },
      { path: 'classes', element: React.createElement(MainClassesPage) },
      { path: 'classes/:classId', element: React.createElement(ClassesDetailPage) },

      { path: 'classes/order', element: React.createElement(MainClassOrderPage) },
      { path: 'classes/order/result', element: React.createElement(MainClassOrderResultPage) },

      { path: 'stores', element: React.createElement(MainStorePage) },

      { path: 'mypage', element: React.createElement(MainMypagePage) },
      { path: 'mypage/classes', element: React.createElement(MainMypageClassesPage) },
    ],
  },
];

export default mainRoutes;
