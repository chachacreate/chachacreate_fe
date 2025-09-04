import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Searchbar from '@src/shared/areas/navigation/features/searchbar/Searchbar';
import { getUserInfoFromToken } from '@src/libs/apiService';
import {
  goToLogin,
  goToMain,
  goToMessage,
  goToSignup,
  logOut,
} from '@src/shared/util/LegacyNavigate';
import type { JWTPayload } from '@src/libs/apiResponse';
import { clearTokens, getCurrentUser } from '@src/shared/util/jwtUtils';

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

  // 공통 로그아웃
  const handleLogout = async () => {
    try {
      if (onLogout) await onLogout();
    } finally {
      clearTokens(); // 로컬 토큰 정리
      setMe(null);
      setMenuOpen(false);
      goToMain();
      alert('로그아웃 성공!');
    }
  };

  // 유저 상태 로딩
  useEffect(() => {
    if (user) {
      setMe(user);
      return;
    }

    // JWT 유틸 함수 사용
    const userInfo = getCurrentUser();
    if (userInfo) {
      setMe({ name: userInfo.name });
    } else {
      setMe(null);
    }
  }, [user]);

  // 스토어 슬러그 추론
  const inferredStoreSlug = useMemo(() => {
    if (typeof storeSlug === 'string') return storeSlug;
    const path = location.pathname.replace(/^\/+/, '');
    const first = path.split('/')[0] || '';
    if (!RESERVED_PREFIXES.has(first)) return first;
    return null;
  }, [location.pathname, storeSlug]);

  const isStore = !!inferredStoreSlug;
  const userName = me?.name ?? undefined;

  // 메시지 이동을 위한 핸들러
  const handleGoToMessage = () => {
    goToMessage(inferredStoreSlug);
  };

  return (
    <header className="w-full border-b border-gray-100">
      {/* 데스크톱 상단 유틸바 (모바일에선 숨김) */}
      {!hideTopBar && (
        <div className="hidden md:block w-full bg-[#2d4739] text-white">
          <div className="mx-auto w-full max-w-[1920px] px-60 h-10 flex items-center justify-end">
            <nav className="flex items-center gap-4 text-sm">
              {me ? (
                <>
                  <span className="whitespace-nowrap">
                    <strong>{userName}</strong>님 반갑습니다!
                  </span>
                  <button onClick={handleGoToMessage} className="hover:underline whitespace-nowrap">
                    {isStore ? `${inferredStoreSlug}에 메시지 보내기` : '메시지'}
                  </button>
                  <button onClick={handleLogout} className="hover:underline whitespace-nowrap">
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <button onClick={goToLogin} className="hover:underline">
                    로그인
                  </button>
                  <span aria-hidden="true">|</span>
                  <button onClick={goToSignup} className="hover:underline">
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
        <div className="mx-auto w-full max-w-[1920px] px-4 min-[1920px]:px-60 h-14 flex items-center gap-3">
          {/* 로고 (모바일에서만 표시) */}
          <button onClick={goToMain} className="flex items-center gap-2">
            <span className="inline-block h-8 w-8 rounded-full bg-white/90" aria-hidden />
          </button>

          {/* Searchbar (가운데, 공통 컴포넌트) */}
          <div className="flex-1">
            <Searchbar />
          </div>

          {/* 메시지 아이콘 (우측) */}
          <button onClick={handleGoToMessage} aria-label="메시지" className="p-2 -mr-1">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z" />
            </svg>
          </button>

          {/* 햄버거 (우측 끝) */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2"
            aria-label="메뉴 열기"
            aria-expanded={menuOpen}
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

        {/* 모바일 드롭다운: 배경/텍스트 색상 헤더와 동일, 항목만 변경 */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/20 bg-[#2d4739] text-white">
            <div className="mx-auto w-full max-w-[1920px] px-4 min-[1920px]:px-60 py-3 text-sm space-y-2">
              {me ? (
                <>
                  <div className="opacity-90">
                    <strong>{userName}</strong>님 반갑습니다!
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                    }}
                    className="block w-full text-left hover:underline"
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
                    className="block w-full text-left hover:underline"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => {
                      goToSignup();
                      setMenuOpen(false);
                    }}
                    className="block w-full text-left hover:underline"
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
