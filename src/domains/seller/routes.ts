import { classRoutes } from "./areas/class/routes";
import { settlementRoutes } from "./areas/settlement/routes";

export const sellerRoutes = [
  {
    path: "/seller/:storeUrl",
    children: [
      // 다른 seller areas도 여기서 합치기
      ...settlementRoutes,
      ...classRoutes,
    ],
  },
];
