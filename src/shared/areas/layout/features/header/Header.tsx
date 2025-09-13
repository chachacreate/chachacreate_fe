import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Searchbar from '@src/shared/areas/navigation/features/searchbar/Searchbar';
import {
  goToLogin,
  goToMain,
  goToMessage,
  goToSignup,
  logOut,
} from '@src/shared/util/LegacyNavigate';
import { clearTokens, getCurrentUser } from '@src/shared/util/jwtUtils';
import mobLogo from '@src/shared/resources/images/logo/mainlogo_mob.png';

type UserLite = { name: string } | null;

type HeaderProps = {
  user?: UserLite;
  storeSlug?: string | null;
  onLogout?: () => Promise<void> | void;
  hideTopBar?: boolean;
};

const RESERVED_PREFIXES = new Set([
  'main',
  'auth',
  'login',
  'signup',
  'admin',
  'api',
  'assets',
  'static',
  '',
]);

export default function Header({ user, storeSlug, onLogout, hideTopBar = false }: HeaderProps) {
  const location = useLocation();

  const [me, setMe] = useState<UserLite>(user ?? null);
  const [menuOpen, setMenuOpen] = useState(false);

  // ✅ 메모이제이션된 핸들러들
  const handleLogout = useCallback(async () => {
    try {
      if (onLogout) await onLogout();
    } finally {
      clearTokens();
      setMe(null);
      setMenuOpen(false);
      goToMain();
      await logOut();
      alert('로그아웃 성공!');
    }
  }, [onLogout]);

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  const closeMenuAndNavigate = useCallback((navigateFn: () => void) => {
    navigateFn();
    setMenuOpen(false);
  }, []);

  // ✅ 스토어 슬러그 추론 최적화
  const inferredStoreSlug = useMemo(() => {
    if (typeof storeSlug === 'string') return storeSlug;
    const path = location.pathname.replace(/^\/+/, '');
    const first = path.split('/')[0] || '';
    if (!RESERVED_PREFIXES.has(first)) return first;
    return null;
  }, [location.pathname, storeSlug]);

  const isStore = useMemo(() => !!inferredStoreSlug, [inferredStoreSlug]);
  const userName = useMemo(() => me?.name, [me?.name]);

  // ✅ 메시지 이동 핸들러 메모이제이션
  const handleGoToMessage = useCallback(() => {
    goToMessage(inferredStoreSlug);
  }, [inferredStoreSlug]);

  // ✅ 네비게이션 핸들러들 메모이제이션
  const handleGoToMain = useCallback(() => goToMain(), []);
  const handleGoToLogin = useCallback(
    () => closeMenuAndNavigate(goToLogin),
    [closeMenuAndNavigate]
  );
  const handleGoToSignup = useCallback(
    () => closeMenuAndNavigate(goToSignup),
    [closeMenuAndNavigate]
  );

  // ✅ 유저 상태 로딩 최적화
  useEffect(() => {
    if (user) {
      setMe(user);
      return;
    }

    const userInfo = getCurrentUser();
    if (userInfo) {
      setMe({ name: userInfo.name });
    } else {
      setMe(null);
    }
  }, [user]);

  // ✅ 메모이제이션된 렌더링 요소들
  const mobileMessageButton = useMemo(
    () => (
      <button onClick={handleGoToMessage} aria-label="메시지" className="p-2 -mr-1">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z" />
        </svg>
      </button>
    ),
    [handleGoToMessage]
  );

  const hamburgerIcon = useMemo(
    () => (
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
    ),
    [menuOpen]
  );

  const desktopUserMenu = useMemo(() => {
    if (!me) {
      return (
        <>
          <button onClick={goToLogin} className="hover:underline hover:underline-offset-2">
            로그인
          </button>
          <span aria-hidden="true">|</span>
          <button onClick={goToSignup} className="hover:underline hover:underline-offset-2">
            회원가입
          </button>
        </>
      );
    }

    return (
      <>
        <span className="whitespace-nowrap">
          <strong>{userName}</strong>님 반갑습니다!
        </span>
        <button
          onClick={handleGoToMessage}
          className="hover:underline hover:underline-offset-2 whitespace-nowrap"
        >
          {isStore ? `${inferredStoreSlug}에 메시지 보내기` : '메시지'}
        </button>
        <button
          onClick={handleLogout}
          className="hover:underline hover:underline-offset-2 whitespace-nowrap"
        >
          로그아웃
        </button>
      </>
    );
  }, [me, userName, handleGoToMessage, isStore, inferredStoreSlug, handleLogout]);

  const mobileDropdownMenu = useMemo(() => {
    if (!menuOpen) return null;

    return (
      <div className="md:hidden border-t border-white/20 bg-[#2d4739] text-white">
        <div className="mx-auto w-full max-w-[1920px] px-4 min-[1920px]:px-60 py-3 text-[15px] space-y-2">
          {me ? (
            <>
              <div className="opacity-90">
                <strong>{userName}</strong>님 반갑습니다!
              </div>
              <button
                onClick={handleLogout}
                className="block w-full text-left hover:underline hover:underline-offset-2"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleGoToLogin}
                className="block w-full text-left hover:underline hover:underline-offset-2"
              >
                로그인
              </button>
              <button
                onClick={handleGoToSignup}
                className="block w-full text-left hover:underline hover:underline-offset-2"
              >
                회원가입
              </button>
            </>
          )}
        </div>
      </div>
    );
  }, [menuOpen, me, userName, handleLogout, handleGoToLogin, handleGoToSignup]);

  return (
    <header className="w-full border-b border-gray-100 font-['Jua',ui-sans-serif,system-ui,sans-serif]">
      {/* 데스크톱 상단 유틸바 */}
      {!hideTopBar && (
        <div className="hidden md:block w-full bg-[#2d4739] text-white">
          <div className="mx-auto w-full max-w-[1920px] px-60 h-[50px] flex items-center justify-end">
            <nav className="flex items-center gap-4 text-[15px]">{desktopUserMenu}</nav>
          </div>
        </div>
      )}

      {/* 모바일 전용 상단 바 */}
      <div className="md:hidden w-full bg-[#2d4739] text-white">
        <div className="mx-auto w-full max-w-[1920px] px-4 min-[1920px]:px-60 h-[50px] flex items-center gap-3">
          {/* 로고 */}
          <button onClick={handleGoToMain} className="flex items-center gap-2">
            <img src={mobLogo} alt="뜨락상회 로고" className="h-8 w-auto" />
          </button>

          {/* 검색바 */}
          <div className="flex-1">
            <Searchbar
              variant="navDark"
              hideButton
              wrapperClassName="[&>svg]:hidden"
              placeholder="검색어를 입력하세요"
            />
          </div>

          {/* 메시지 아이콘 */}
          {mobileMessageButton}

          {/* 햄버거 */}
          <button
            onClick={toggleMenu}
            className="p-2"
            aria-label="메뉴 열기"
            aria-expanded={menuOpen}
          >
            {hamburgerIcon}
          </button>
        </div>

        {/* 모바일 드롭다운 */}
        {mobileDropdownMenu}
      </div>
    </header>
  );
}
