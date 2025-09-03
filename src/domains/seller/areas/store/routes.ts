// src/domains/seller/areas/store/routes.ts
import React, { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { RouteObject } from 'react-router-dom';
import { createElement, Suspense } from 'react';

// /seller/:storeUrl/store/*
const StoreNoticePage = lazy(
  () => import('@src/domains/seller/areas/store/features/notice/pages/StoreNotice')
);
const StoreCustomPage = lazy(() =>
  import("@src/domains/seller/areas/store/features/custom/pages/StoreCustom")
);

const StoreInfoPage = lazy(() =>
  import("@src/domains/seller/areas/store/features/info/pages/StoreInfo")
);

// /seller/:storeUrl/storeinfo
const StoreChatPage = lazy(() =>
  import("@src/domains/seller/areas/store/features/chat/pages/StoreChat")
);

const suspense = (Comp: LazyExoticComponent<ComponentType<any>>) =>
  createElement(
    Suspense,
    { fallback: createElement('div', { className: 'p-6' }, '로딩…') },
    createElement(Comp)
  );

export const storeRoutes: RouteObject[] = [
  // /seller/:storeUrl/store/*
  {
    path: 'store',
    children: [
      { path: 'notice', element: suspense(StoreNoticePage) },
      { path: "custom", element: suspense(StoreCustomPage) },
    ],
  },
  // /seller/:storeUrl/storeinfo
  { path: "storeinfo", element: suspense(StoreInfoPage) },
    // /seller/:storeUrl/message
  { path: "message", element: suspense(StoreChatPage) },

];