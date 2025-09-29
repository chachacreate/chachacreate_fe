import React, { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { RouteObject } from 'react-router-dom';
import { createElement, Suspense } from 'react';
import { mypageRoutes } from '../main/areas/mypage/routes';
import Loading from '@src/shared/areas/loading/loading';

const StoreHomePage = lazy(() => import('@src/domains/buyer/areas/main/pages/StoreMain'));

const StoreClassesPage = lazy(
  () => import('@src/domains/buyer/areas/classes/pages/StoreClassesPage')
);

const StoreProducts = lazy(() => import('@src/domains/buyer/areas/products/pages/Storeproducts'));

const productDetailPage = lazy(
  () => import('@src/domains/main/areas/home/features/products/pages/MainProductsDetail')
);

const StoreInfoPage = lazy(() => import('@src/domains/buyer/areas/info/pages/StoreInfo'));

const StoreNoticesPage = lazy(
  () => import('@src/domains/buyer/areas/notice/pages/StoreNotice')
);

// ✅ Suspense wrapper
const withSuspense = (Comp: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement(Loading) },
    createElement(Comp)
  );

/**
 * Buyer 라우트
 * 기본 진입: /store/:storeUrl  → 메인(구매자 스토어 홈)
 * 하위 경로(Products/Classes/Notices)는 페이지 준비 전까지 임시 placeholder로 처리
 */
export const buyerRoutes: RouteObject[] = [
  {
    path: '/:store',
    children: [
      { index: true, element: withSuspense(StoreHomePage) },

      // 실제 페이지 연결
      {
        path: 'products',
        children: [
          { index: true, element: withSuspense(StoreProducts) }, // 상품 리스트
          { path: ':productId', element: withSuspense(productDetailPage) }, // 상품 상세
        ],
      },
      { 
        path: 'info', 
        element: withSuspense(StoreInfoPage) 
      },
      {
        path: 'classes',
        element: withSuspense(StoreClassesPage),
      },
      {
        path: 'notices',
        element: withSuspense(StoreNoticesPage),
      },
      ...mypageRoutes,
    ],
  },
];