import { settlementRoutes } from "./areas/settlement/routes";

export const sellerRoutes = [
  {
    path: "/:storeUrl/seller",
    children: [
      // 다른 seller areas도 여기서 합치기
      ...settlementRoutes,
    ],
  },
];
