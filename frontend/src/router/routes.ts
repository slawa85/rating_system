export const ROUTES = {
  HOME: '/',
  PRODUCT_DETAIL: '/products/:id',
  LOGIN: '/login',
  REGISTER: '/register',
} as const;

export const getProductDetailPath = (id: string) => `/products/${id}`;
