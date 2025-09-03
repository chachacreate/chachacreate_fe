// src/common/auth/login/routes.ts
import React from 'react';
import type { RouteObject } from 'react-router-dom';
import LoginPage from '@src/domains/common/auth/login/pages/LoginPage';

const loginRoutes: RouteObject[] = [
  { path: 'auth/login', element: React.createElement(LoginPage) },
];

export default loginRoutes;
