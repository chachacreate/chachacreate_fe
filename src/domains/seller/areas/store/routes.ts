// src/domains/seller/areas/store/routes.ts
import React, { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { RouteObject } from 'react-router-dom';
import { createElement, Suspense } from 'react';
import Loading  from '@src/shared/areas/loading/loading';

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


// ✅ Suspense wrapper
const withSuspense = (Comp: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement(Loading) },
    createElement(Comp)
  );

export const storeRoutes: RouteObject[] = [
  // /seller/:storeUrl/store/*
  {
    path: 'store',
    children: [
      { path: 'notice', element: withSuspense(StoreNoticePage) },
      { path: "custom", element: withSuspense(StoreCustomPage) },
    ],
  },
  // /seller/:storeUrl/storeinfo
  { path: "storeinfo", element: withSuspense(StoreInfoPage) },
    // /seller/:storeUrl/message
  { path: "message", element: withSuspense(StoreChatPage) },

];