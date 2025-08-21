// src/shared/areas/layout/features/header/Header.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

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

  const handleMockLogin = () => {
    localStorage.setItem("accessToken", "mock-token");
    localStorage.setItem("email", mockEmail);
    localStorage.setItem("userName", mockUserName);
    setMe({ name: mockUserName });
  };

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

  // 현재 URL에서 스토어 슬러그 추론
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

  // 네비 "스토어" 링크 (모킹일 때 임시 스토어로)
  const storeNavHref = useMockAuth ? `/${mockStoreSlug}` : "/main/stores";

  const goToMain = () => navigate("/main");

  return (
    <header className="w-full border-b border-gray-100">
      {!hideTopBar && (
        <div className="w-full bg-[#2d4739] bg-emerald-900 text-white">
          <div className="mx-auto w-full max-w-[1920px] px-60 h-10 flex items-center justify-end">
            <nav className="hidden md:flex items-center gap-4 text-sm">
              {me ? (
                <>
                  <span className="whitespace-nowrap">
                    <strong>{userName}</strong>님 반갑습니다!
                  </span>
                  {/* ✅ 스토어일 때 라벨을 '{store}에 메시지 보내기'로 */}
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

            {/* 모바일 햄버거 */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center rounded p-1 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="메뉴 열기"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                {menuOpen ? (
                  <path fillRule="evenodd" d="M6.225 4.811a1 1 0 011.414 0L12 9.172l4.361-4.361a1 1 0 011.414 1.414L13.414 10.586l4.361 4.361a1 1 0 01-1.414 1.414L12 12l-4.361 4.361a1 1 0 01-1.414-1.414l4.361-4.361-4.361-4.361a1 1 0 010-1.414z" clipRule="evenodd"/>
                ) : (
                  <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
                )}
              </svg>
            </button>
          </div>

          {/* 모바일 드롭다운 */}
          {menuOpen && (
            <div className="md:hidden border-t border-[#2d4739]/40 bg-[#2d4739] bg-emerald-900">
              <div className="px-4 py-3 space-y-2 text-sm">
                {me ? (
                  <>
                    <div className="text-white/90">
                      <strong>{userName}</strong>님 반갑습니다!
                    </div>
                    {/* ✅ 모바일도 동일하게 조건 라벨 */}
                    <Link
                      to={messageHref}
                      onClick={() => setMenuOpen(false)}
                      className="block text-white hover:underline"
                    >
                      {isStore ? `${inferredStoreSlug}에 메시지 보내기` : "메시지"}
                    </Link>
                    <button
                      onClick={() => { handleLogout(); }}
                      className="block text-left w-full text-white hover:underline"
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <>
                    {useMockAuth ? (
                      <>
                        <button
                          onClick={() => { handleMockLogin(); setMenuOpen(false); }}
                          className="block text-left w-full text-white hover:underline"
                        >
                          임시 로그인
                        </button>
                        <button
                          onClick={() => { navigate("/auth/signup"); setMenuOpen(false); }}
                          className="block text-left w-full text-white hover:underline"
                        >
                          회원가입(이동)
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/auth/login"
                          onClick={() => setMenuOpen(false)}
                          className="block text-white hover:underline"
                        >
                          로그인
                        </Link>
                        <Link
                          to="/auth/signup"
                          onClick={() => setMenuOpen(false)}
                          className="block text-white hover:underline"
                        >
                          회원가입
                        </Link>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 로고/기본 네비 : 동적 테스트용, 나중에 지워야함*/}
      <div className="mx-auto w-full max-w-[1920px] px-60 h-16 flex items-center justify-between">
        <button onClick={goToMain} className="flex items-center gap-2">
          <span className="inline-block h-8 w-8 rounded-full bg-[#2d4739] bg-emerald-900" />
          <span className="font-semibold text-lg">뜨락상회</span>
        </button>

        <div className="hidden sm:flex items-center gap-3">
          <Link to="/main" className="text-sm hover:underline">홈</Link>
          <Link to={storeNavHref} className="text-sm hover:underline">스토어</Link>
          <Link to="/main/classes" className="text-sm hover:underline">클래스</Link>
        </div>
      </div>

      {!useMockAuth && loadingMe && (
        <div className="h-0.5 w-full bg-gray-100">
          <div className="h-0.5 w-1/3 bg-[#2d4739] bg-emerald-900 animate-pulse" />
        </div>
      )}
    </header>
  );
}
