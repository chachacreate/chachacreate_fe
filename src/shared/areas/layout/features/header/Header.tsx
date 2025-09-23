import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Searchbar from '@src/shared/areas/navigation/features/searchbar/Searchbar';
import { goToLogin, goToSignup, logOut } from '@src/shared/util/LegacyNavigate';
import { clearTokens, getCurrentUser } from '@src/shared/util/jwtUtils';
import mobLogo from '@src/shared/resources/images/logo/mainlogo_mob.png';
import { legacyGet, post } from '@src/libs/request';

type UserLite = { name: string } | null;

type HeaderProps = {
  user?: UserLite;
  storeSlug?: string | null;
  hideTopBar?: boolean;
};

type StoreInfo = {
  storeName: string;
  logoImg: string;
  storeOwnerId: string | number;
  storeUrl: string;
};

const RESERVED_PREFIXES = new Set([
  'main',
  'auth',
  'auth',
  'admin',
  'api',
  'assets',
  'static',
  'seller',
  'resources',
  '',
]);

export default function Header({ user, storeSlug, hideTopBar = false }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [me, setMe] = useState<UserLite>(user ?? null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);

  // 현재 사용자 정보를 useMemo로 최적화
  const currentUser = useMemo(() => {
    return getCurrentUser();
  }, []);

  // 공통 로그아웃
  const handleLogout = async () => {
    await logOut();
    clearTokens(); // 로컬 토큰 정리
    setMe(null);
    setMenuOpen(false);
    navigate('/main');
    alert('로그아웃 성공!');
  };

  // 유저 상태 로딩
  useEffect(() => {
    if (user) {
      setMe(user);
      return;
    }

    // JWT 유틸 함수 사용
    if (currentUser) {
      setMe({ name: currentUser.name });
    } else {
      setMe(null);
    }
  }, [user, currentUser]);

  // 스토어 슬러그 추론
  const inferredStoreSlug = useMemo(() => {
    const path = location.pathname.replace(/^\/+/, ''); // 앞 / 제거
    const segments = path.split('/');

    // 무조건 첫번째를 가져옴
    let slugCandidate = segments[0];

    if (!slugCandidate || RESERVED_PREFIXES.has(slugCandidate)) return null;
    return slugCandidate;
  }, [location.pathname]);

  // 스토어 정보 로드 (스토어 페이지일 때만)
  useEffect(() => {
    if (!inferredStoreSlug || RESERVED_PREFIXES.has(inferredStoreSlug)) {
      setStoreInfo(null);
      return;
    }

    const controller = new AbortController();

    const loadStoreInfo = async () => {
      try {
        const url = `/info/store/${inferredStoreSlug}`.replace(/\/{2,}/g, '/');

        // API 응답이 { data: {...}, message: "...", status: 200 } 형태로 래핑되어 있음
        const response = await legacyGet<{ data: StoreInfo; message: string; status: number }>(url);

        // console.log('스토어 정보 로드 성공:', response);
        if (controller.signal.aborted) return;

        // response.data에서 실제 스토어 데이터 추출
        const storeData = response.data;
        setStoreInfo({
          storeName: storeData.storeName,
          logoImg: storeData.logoImg,
          storeOwnerId: storeData.storeOwnerId,
          storeUrl: storeData.storeUrl,
        });

        // console.log('스토어 정보 설정 완료:', storeData.storeName);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        console.error('스토어 정보 로드 실패:', error);
        setStoreInfo(null);
      }
    };

    loadStoreInfo();
    return () => controller.abort();
  }, [inferredStoreSlug]);

  // 스토어 오너 여부 확인
  const isStoreOwner = useMemo(() => {
    if (!currentUser?.memberId || !storeInfo?.storeOwnerId) return false;
    return String(currentUser.memberId) === String(storeInfo.storeOwnerId);
  }, [currentUser?.memberId, storeInfo?.storeOwnerId]);

  // 현재 위치가 메인 페이지인지 확인
  const isMainPage = useMemo(() => {
    const path = location.pathname.replace(/^\/+/, '');
    const first = path.split('/')[0] || '';
    return first === 'main' || first === '';
  }, [location.pathname]);

  // 스토어 채팅방 생성 및 리다이렉트
  const createStoreChatAndRedirect = async (storeUrl: string, storeName: string) => {
    const buyerId = currentUser?.memberId;

    if (!buyerId) {
      alert('로그인이 필요합니다.');
      goToLogin();
      return;
    }

    try {
      // console.log('채팅방 생성 중...');

      const chatData = await post<any>(`/api/chat/personal/${storeUrl}`, {
        buyerId: buyerId,
      });

      // console.log('채팅방 생성/연결 완료:', chatData);
      navigate(`/${storeUrl}/mypage/message`);
    } catch (error: any) {
      console.error('채팅방 생성 실패:', error);

      // 409 상태 코드(이미 존재)인 경우에도 메시지 페이지로 이동
      if (error?.response?.status === 409 || error?.response?.status === 200) {
        // console.log('기존 채팅방 사용');
        navigate(`/${storeUrl}/mypage/message`);
      } else {
        alert('채팅방 생성에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  // 메시지 버튼 설정
  const messageConfig = useMemo(() => {
    // 로그인하지 않은 경우
    if (!me) {
      return {
        text: '메시지',
        action: () => {
          alert('로그인이 필요합니다.');
          goToLogin();
        },
      };
    }

    // 메인 페이지이거나 스토어 정보가 없는 경우
    if (isMainPage || !storeInfo) {
      return {
        text: '메시지',
        action: () => navigate(`/main/mypage/message`),
      };
    }

    // 내 스토어인 경우
    if (isStoreOwner) {
      return {
        text: '메시지',
        action: () => navigate(`/${storeSlug}/mypage/message`),
      };
    }

    // 다른 사람의 스토어인 경우
    return {
      text: `${storeInfo.storeName}에 메시지 보내기`,
      action: () => createStoreChatAndRedirect(storeInfo.storeUrl, storeInfo.storeName),
    };
  }, [me, isMainPage, storeInfo, isStoreOwner]);

  const userName = me?.name ?? undefined;

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const mobileMenu = document.getElementById('mobile-menu');
      const menuButton = document.getElementById('mobile-menu-button');

      if (
        mobileMenu &&
        menuButton &&
        !mobileMenu.contains(target) &&
        !menuButton.contains(target) &&
        menuOpen
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  // 화면 크기 변경시 메뉴 닫기
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header className="w-full border-b border-gray-100 font-jua">
      {/* 데스크톱 상단 유틸바 (모바일에선 숨김) */}
      {!hideTopBar && (
        <div className="hidden md:block w-full bg-[#2d4739] text-white">
          <div className="mx-auto w-full max-w-[1920px] px-4 lg:px-16 xl:px-60 h-[50px] flex items-center justify-end">
            <nav className="flex items-center gap-4 text-[15px]">
              {me ? (
                <>
                  <span className="whitespace-nowrap text-white">
                    <strong>{userName}</strong>님 반갑습니다!
                  </span>
                  <button
                    onClick={messageConfig.action}
                    className="hover:underline hover:underline-offset-2 whitespace-nowrap text-white bg-transparent border-0 cursor-pointer"
                  >
                    {messageConfig.text}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="hover:underline hover:underline-offset-2 whitespace-nowrap text-white bg-transparent border-0 cursor-pointer"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={goToLogin}
                    className="hover:underline hover:underline-offset-2 text-white bg-transparent border-0 cursor-pointer"
                  >
                    로그인
                  </button>
                  <span aria-hidden="true" className="text-white">
                    |
                  </span>
                  <button
                    onClick={goToSignup}
                    className="hover:underline hover:underline-offset-2 text-white bg-transparent border-0 cursor-pointer"
                  >
                    회원가입
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* 모바일 전용 상단 바: 로고 | Searchbar | 메시지아이콘 | 햄버거 */}
      <div className="md:hidden w-full bg-[#2d4739] text-white">
        <div className="mx-auto w-full max-w-[1920px] px-4 min-[1920px]:px-60 h-[50px] flex items-center gap-3">
          {/* 로고 (왼쪽) */}
          <Link to={'/main'} className="flex items-center gap-2 flex-shrink-0">
            <img src={mobLogo} alt="뜨락상회 로고" className="h-8 w-auto" />
          </Link>

          {/* 검색바 (중앙, flex-1로 공간 차지) */}
          <div className="flex-1 min-w-0">
            <Searchbar
              variant="navDark"
              hideButton
              wrapperClassName="[&>svg]:hidden w-full"
              placeholder="검색어를 입력하세요"
            />
          </div>

          {/* 메시지 아이콘 (우측) */}
          <div className="flex-shrink-0">
            <button
              onClick={messageConfig.action}
              aria-label={messageConfig.text}
              className="p-2 -mr-1 text-white bg-transparent border-0"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z" />
              </svg>
            </button>
          </div>

          {/* 햄버거 메뉴 (우측 끝) */}
          <div className="flex-shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 text-white"
              aria-label="메뉴 열기"
              aria-expanded={menuOpen}
              id="mobile-menu-button"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                {menuOpen ? (
                  <path
                    fillRule="evenodd"
                    d="M6.225 4.811a1 1 0 0 1 1.414 0L12 9.172l4.361-4.361a1 1 0 0 1 1.414 1.414L13.414 10.586l4.361 4.361a1 1 0 0 1-1.414 1.414L12 12l-4.361 4.361a1 1 0 0 1-1.414-1.414l4.361-4.361-4.361-4.361a1 1 0 0 1 0-1.414Z"
                    clipRule="evenodd"
                  />
                ) : (
                  <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* 모바일 드롭다운 메뉴 */}
        {menuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden border-t border-white/20 bg-[#2d4739] text-white"
          >
            <div className="mx-auto w-full max-w-[1920px] px-4 min-[1920px]:px-60 py-3 text-[15px] space-y-2">
              {me ? (
                <>
                  <div className="opacity-90 text-white">
                    <strong>{userName}</strong>님 반갑습니다!
                  </div>
                  <button
                    onClick={() => {
                      messageConfig.action();
                      setMenuOpen(false);
                    }}
                    className="block w-full text-left hover:underline hover:underline-offset-2 text-white bg-transparent border-0"
                  >
                    {messageConfig.text}
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMenuOpen(false);
                    }}
                    className="block w-full text-left hover:underline hover:underline-offset-2 text-white bg-transparent border-0"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      goToLogin();
                      setMenuOpen(false);
                    }}
                    className="block w-full text-left hover:underline hover:underline-offset-2 text-white bg-transparent border-0"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => {
                      goToSignup();
                      setMenuOpen(false);
                    }}
                    className="block w-full text-left hover:underline hover:underline-offset-2 text-white bg-transparent border-0"
                  >
                    회원가입
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
