import { classRoutes } from "./areas/class/routes";
import { mainRoutes } from "./areas/main/pages/routes";
import { settlementRoutes } from "./areas/settlement/routes";
import { storeRoutes } from "./areas/store/routes";

export const sellerRoutes = [
  {
    path: "/seller/:storeUrl",
    children: [
      // 다른 seller areas도 여기서 합치기
      ...settlementRoutes,
      ...classRoutes,
      ...storeRoutes,
      ...mainRoutes
    ],
  },
];
