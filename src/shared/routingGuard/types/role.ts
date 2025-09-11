export const ROLES = {
  USER: 'USER',
  SELLER: 'SELLER',
  PERSONAL_SELLER: 'PERSONAL_SELLER',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
