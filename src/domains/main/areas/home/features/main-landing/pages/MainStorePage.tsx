// src/domains/main/areas/home/features/main-landing/pages/MainStorePage.tsx    
import { Link } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";

type StoreItem = {
  slug: string;   // URL 슬러그
  name: string;   // 표시 이름
};

const STORES: StoreItem[] = [
  { slug: "earthus", name: "얼스어스" },
  { slug: "horizon16", name: "호라이즌16" },
  { slug: "tosy", name: "토시" },
  { slug: "lime-studio", name: "라임스튜디오" },
  { slug: "soso", name: "소소공방" },
  { slug: "dobune", name: "토분이네" },
];

export default function MainStorePage() {
  return (
    <>
      <Header />
      <Mainnavbar />

      <main className="mx-auto max-w-[1920px] px-4 sm:px-8 lg:px-12 xl:px-20 2xl:px-[240px] py-10">
        <h1 className="text-2xl lg:text-3xl font-bold">스토어 모음</h1>
        <p className="mt-2 text-gray-600">000테스트 페이지 입니다</p>

        <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {STORES.map((s) => (
            <Link
              key={s.slug}
              to={`/${s.slug}/classes`}
              className="group block rounded-2xl overflow-hidden border border-gray-200 bg-white hover:shadow-md transition-shadow"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 grid place-items-center">
                <span className="text-gray-500">썸네일</span>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold group-hover:underline">{s.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{s.slug}/classes</p>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}
