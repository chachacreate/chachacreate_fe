// src/shared/areas/layout/features/header/Header.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Searchbar from "@src/shared/areas/navigation/features/searchbar/Searchbar";

type MeResponse = { name: string };
type UserLite = { name: string } | null;

type HeaderProps = {
  user?: UserLite;
  storeSlug?: string | null;
  onLogout?: () => Promise<void> | void;
  hideTopBar?: boolean;
  useMockAuth?: boolean;
  mockUserName?: string;
  mockEmail?: string;
  mockStoreSlug?: string;
};

const RESERVED_PREFIXES = new Set([
  "main","auth","login","signup","admin","api","assets","static","",
]);

export default function Header({
  user,
  storeSlug,
  onLogout,
  hideTopBar = false,
  useMockAuth = true,
  mockUserName = "홍길동",
  mockEmail = "mock@example.com",
  mockStoreSlug = "mintstore",
}: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [me, setMe] = useState<UserLite>(user ?? null);
  const [loadingMe, setLoadingMe] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // 모킹 로그인
  const handleMockLogin = () => {
    localStorage.setItem("accessToken", "mock-token");
    localStorage.setItem("email", mockEmail);
    localStorage.setItem("userName", mockUserName);
    setMe({ name: mockUserName });
  };

  // 공통 로그아웃
  const handleLogout = async () => {
    try { if (onLogout) await onLogout(); }
    finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("Authorization");
      localStorage.removeItem("email");
      setMe(null);
      setMenuOpen(false);
      navigate("/main");
    }
  };

  // 유저 상태 로딩
  useEffect(() => {
    if (user) { setMe(user); return; }
    const token = localStorage.getItem("accessToken") || localStorage.getItem("Authorization");
    if (!token) { setMe(null); return; }

    if (useMockAuth) {
      const name = localStorage.getItem("userName") ?? mockUserName;
      setMe({ name });
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoadingMe(true);
        const { get } = await import("@src/libs/request");
        const res = await get<MeResponse>("/api/auth/me");
        if (!mounted) return;
        const name = res.data?.name ?? localStorage.getItem("userName") ?? "사용자";
        localStorage.setItem("userName", name);
        setMe({ name });
      } finally {
        if (mounted) setLoadingMe(false);
      }
    })();
    return () => { mounted = false; };
  }, [user, useMockAuth, mockUserName]);

  // 스토어 슬러그 추론
  const inferredStoreSlug = useMemo(() => {
    if (typeof storeSlug === "string") return storeSlug;
    const path = location.pathname.replace(/^\/+/, "");
    const first = path.split("/")[0] || "";
    if (!RESERVED_PREFIXES.has(first)) return first;
    return null;
  }, [location.pathname, storeSlug]);

  const isStore = !!inferredStoreSlug;
  const userName = me?.name ?? localStorage.getItem("userName") ?? undefined;

  // 메시지 링크
  const messageHref = isStore
    ? `/${inferredStoreSlug}/mypage/message`
    : `/main/mypage/message`;

  // 네비 "스토어" 링크 (모킹이면 임시 스토어로)
  const storeNavHref = useMockAuth ? `/${mockStoreSlug}` : "/main/stores";

  const goToMain = () => navigate("/main");

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
                  <Link to={messageHref} className="hover:underline whitespace-nowrap">
                    {isStore ? `${inferredStoreSlug}에 메시지 보내기` : "메시지"}
                  </Link>
                  <button onClick={handleLogout} className="hover:underline whitespace-nowrap">
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  {useMockAuth ? (
                    <>
                      <button onClick={handleMockLogin} className="hover:underline">임시 로그인</button>
                      <span aria-hidden="true">|</span>
                      <button onClick={() => navigate("/auth/signup")} className="hover:underline">
                        회원가입(이동)
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/auth/login" className="hover:underline">로그인</Link>
                      <span aria-hidden="true">|</span>
                      <Link to="/auth/signup" className="hover:underline">회원가입</Link>
                    </>
                  )}
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
          <Link to={messageHref} aria-label="메시지" className="p-2 -mr-1">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z"/>
            </svg>
          </Link>

          {/* 햄버거 (우측 끝) */}
          <button
            onClick={() => setMenuOpen(v => !v)}
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
                    onClick={() => { handleLogout(); }}
                    className="block w-full text-left hover:underline"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { useMockAuth ? handleMockLogin() : navigate("/auth/login"); setMenuOpen(false); }}
                    className="block w-full text-left hover:underline"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => { navigate("/auth/signup"); setMenuOpen(false); }}
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

      {/* 데스크톱 로고/기본 네비 (모바일에선 숨김) */}
      <div className="hidden md:flex">
        <div className="mx-auto w-full max-w-[1920px] px-60 h-16 flex items-center justify-between">
          <button onClick={goToMain} className="flex items-center gap-2">
            <span className="inline-block h-8 w-8 rounded-full bg-[#2d4739]" aria-hidden />
            <span className="font-semibold text-lg">뜨락상회</span>
          </button>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/main" className="text-sm hover:underline">홈</Link>
            <Link to={storeNavHref} className="text-sm hover:underline">스토어</Link>
            <Link to="/main/classes" className="text-sm hover:underline">클래스</Link>
          </div>
        </div>
      </div>

      {/* 실서버 모드에서만 의미 있는 로딩바 */}
      {!useMockAuth && loadingMe && (
        <div className="h-0.5 w-full bg-gray-100">
          <div className="h-0.5 w-1/3 bg-[#2d4739] animate-pulse" />
        </div>
      )}
    </header>
  );
}
