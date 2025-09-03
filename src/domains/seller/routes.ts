import { classRoutes } from "@src/domains/seller/areas/class/routes";
import { mainRoutes } from "@src/domains/seller/areas/main/pages/routes";
import { productRoutes } from "@src/domains/seller/areas/product/routes";
import { settlementRoutes } from "@src/domains/seller/areas/settlement/routes";
import { storeRoutes } from "@src/domains/seller/areas/store/routes";

export const sellerRoutes = [
  {
    path: "/seller/:storeUrl",
    children: [
      // 다른 seller areas도 여기서 합치기
      ...settlementRoutes,
      ...classRoutes,
      ...storeRoutes,
      ...mainRoutes,
      ...productRoutes,
    ],
  },
];
