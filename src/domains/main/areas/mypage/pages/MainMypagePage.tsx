import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import MypageSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar";

export default function MainMypagePage() {
  return (
    <>
      <Header />
      <Mainnavbar />
      
      {/* MypageSidenavbar에 children으로 콘텐츠 전달 */}
      <MypageSidenavbar>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h1 className="text-xl sm:text-2xl font-bold">000 마이페이지 입니다</h1>
          <p className="mt-2 text-gray-600">임시 콘텐츠</p>
          
          {/* 마이페이지 메인 콘텐츠 영역 */}
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h2 className="font-semibold text-gray-900">계정 정보</h2>
              <p className="text-sm text-gray-600 mt-1">회원 정보를 관리하고 수정할 수 있습니다.</p>
            </div>
            
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h2 className="font-semibold text-gray-900">최근 활동</h2>
              <p className="text-sm text-gray-600 mt-1">최근 주문내역과 활동을 확인할 수 있습니다.</p>
            </div>
          </div>
        </div>
      </MypageSidenavbar>
    </>
  );
}