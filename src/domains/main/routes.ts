// src/domains/main/routes.ts
import React from 'react';
import type { RouteObject } from 'react-router-dom';

import MainLandingPage from '@src/domains/main/areas/home/features/main-landing/pages/MainLandingPage';
import MainClassesPage from '@src/domains/main/areas/home/features/main-landing/pages/MainClassesPage';
import ClassesDetailPage from '@src/domains/main/areas/home/features/class-detail/pages/ClassesDetailPage';
import MainClassOrderPage from '@src/domains/main/areas/home/features/class-order/pages/MainClassOrderPage';
import MainClassOrderResultPage from '@src/domains/main/areas/home/features/class-order/pages/MainClassOrderResultPage';
import ProductsOrderSuccess from '@src/domains/main/areas/home/features/products/pages/ProductsOrderSuccess';
import MainProductsorder from '@src/domains/main/areas/home/features/products/pages/MainProductsorder';

import { productsRoutes } from '@src/domains/main/areas/home/features/products/routes';
import { storesRoutes } from './areas/home/features/stores/routes';
import { sellRoutes } from './areas/home/features/sell/routes';
import { mypageRoutes } from '@src/domains/main/areas/mypage/routes';
import { wrapRoutesWithProtection } from '@src/shared/util/routeWrapper';

const mainRoutes: RouteObject[] = [
  {
    path: 'main',
    children: [
      { index: true, element: React.createElement(MainLandingPage) },

      // classes
      { path: 'classes', element: React.createElement(MainClassesPage) },
      { path: 'classes/:classId', element: React.createElement(ClassesDetailPage) },
      // 🟢 주문/결제 페이지들 - 방법 1: 일반적인 경로 구조 사용
      ...wrapRoutesWithProtection(
        [
          { path: 'classes/order', element: React.createElement(MainClassOrderPage) },
          { path: 'classes/order/result', element: React.createElement(MainClassOrderResultPage) },
          { path: 'order', element: React.createElement(MainProductsorder) },
          { path: 'order/result/:result', element: React.createElement(ProductsOrderSuccess) },
        ],
        [],
        '/auth/login'
      ),

      // products
      { path: 'products', children: productsRoutes },
      ...storesRoutes,
      ...sellRoutes,
      ...mypageRoutes, // /main/mypage
    ],
  },
];

export default mainRoutes;
