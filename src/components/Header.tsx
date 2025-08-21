import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStoreCtx } from "../contexts/StoreContext";
import type { FC } from "react";

const Header: FC = () => {
  const { user, logout } = useAuth();
  const { store } = useStoreCtx();

  const RightSide = () => {
    // 1) 로그인 전
    if (!user) {
      return (
        <div className="flex w-[1920px] h-[50px] items-center justify-end gap-2.5 px-60 py-[13px] relative bg-[#2d4739]">
          <div className="relative w-[145px] h-6 mr-[-6.00px]">
            <Link
              to="/login"
              className="left-0 absolute top-0 [font-family:'Jua-Regular',Helvetica] font-normal text-white text-base leading-6 whitespace-nowrap"
            >
              로그인
            </Link>
            <Link
              to="/signup"
              className="left-[85px] absolute top-0 [font-family:'Jua-Regular',Helvetica] font-normal text-white text-base leading-6 whitespace-nowrap"
            >
              회원가입
            </Link>
            <span className="absolute top-0 left-[65px] [font-family:'Jua-Regular',Helvetica] font-normal text-white text-base leading-6 whitespace-nowrap">
              |
            </span>
          </div>
        </div>
      );
    }

    // 2) 로그인 후 (메시지/로그아웃/인사)
    if (user && !store) {
      return (
        <div className="w-[1920px] h-[50px]">
          <div className="flex w-[1920px] h-[50px] items-center justify-end gap-2.5 px-[250px] py-0 relative">
            {/* 배경이 로고를 덮지 않게 z-0 */}
            <div className="absolute z-0 w-[1920px] h-[50px] top-0 left-0 bg-[#2d4739]" />
            <div className="relative w-[694px] h-[50px] mr-[-6.00px]">
              <div className="absolute w-[84px] h-[50px] top-0 left-[532px] bg-[#2d4739]">
                <Link
                  to="/messages"
                  className="left-[22px] absolute top-[13px] [font-family:'Jua-Regular',Helvetica] font-normal text-white text-base leading-6 whitespace-nowrap"
                >
                  메시지
                </Link>
              </div>
              <button
                onClick={logout}
                className="left-[636px] absolute top-[13px] [font-family:'Jua-Regular',Helvetica] font-normal text-white text-base leading-6 whitespace-nowrap"
              >
                로그아웃
              </button>
              <div className="absolute w-[520px] top-[13px] left-0 [font-family:'Jua-Regular',Helvetica] font-normal text-white text-base text-right leading-6">
                {user.name}님 반갑습니다!
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 3) 로그인 후 + 스토어 접속
    return (
      <div className="w-[1920px] h-[50px] bg-[#2d4739]">
        <div className="flex w-[400px] items-center gap-[30px] relative top-[13px] left-[1280px]">
          <span className="relative w-fit mt-[-1.00px] [font-family:'Jua-Regular',Helvetica] font-normal text-white text-base leading-6 whitespace-nowrap">
            {user?.name}님 반갑습니다!
          </span>
          <Link
            to={`/store/${store!.id}/message`}
            className="relative w-fit mt-[-1.00px] [font-family:'Jua-Regular',Helvetica] font-normal text-white text-base leading-6 whitespace-nowrap"
          >
            {store?.name}에 메시지 보내기
          </Link>
          <button
            onClick={logout}
            className="relative w-fit mt-[-1.00px] [font-family:'Jua-Regular',Helvetica] font-normal text-white text-base leading-6 whitespace-nowrap"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  };

  return (
    <header className="w-full">
      {/* 로고가 항상 위로 오도록 absolute + z-10 */}
      <div className="relative w-[1920px] h-[50px] mx-auto">
        <Link
          to="/"
          className="absolute z-10 left-6 top-[13px] [font-family:'Jua-Regular',Helvetica] font-bold text-white no-underline"
        >
          ChachaCreate
        </Link>
        <RightSide />
      </div>
    </header>
  );
};

export default Header;
