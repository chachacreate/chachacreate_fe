import React, { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { RouteObject } from 'react-router-dom';
import { createElement, Suspense } from 'react';
import { mypageRoutes } from '../main/areas/mypage/routes';

const StoreHomePage = lazy(() => import('@src/domains/buyer/areas/main/pages/StoreMain'));

const StoreClassesPage = lazy(
  () => import('@src/domains/buyer/areas/classes/pages/StoreClassesPage')
);

const StoreProducts = lazy(() => import('@src/domains/buyer/areas/products/pages/Storeproducts'));

const productDetailPage = lazy(
  () => import('@src/domains/main/areas/home/features/products/pages/MainProductsDetail')
);

const suspense = (Comp: LazyExoticComponent<ComponentType<any>>) =>
  createElement(
    Suspense,
    { fallback: createElement('div', { className: 'p-6' }, '로딩…') },
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
      { index: true, element: suspense(StoreHomePage) },

      // 실제 페이지 연결
      {
        path: 'products',

        children: [
          { index: true, element: suspense(StoreProducts) }, // 상품 리스트
          { path: ':productId', element: suspense(productDetailPage) }, // 상품 상세
        ],
      },
      {
        path: 'classes',
        element: suspense(StoreClassesPage),
      },
      {
        path: 'notices',
        element: createElement('div', { className: 'p-6' }, '스토어 공지 페이지가 곧 준비됩니다.'),
      },
      ...mypageRoutes,
    ],
  },
];
