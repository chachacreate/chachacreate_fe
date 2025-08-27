// src/domains/main/areas/home/features/main-landing/pages/MainLandingPage.tsx
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";


export default function MainLandingPage() {
  return (
    <>
      <Header />
      <Mainnavbar />
      <main className="container-1920 py-12">
        <h1 className="text-3xl font-bold">메인 랜딩</h1>
        <p className="mt-2 text-gray-600">여기에 메인 배너/섹션이 들어갑니다.</p>
      </main>
      
    </>
  );
}
