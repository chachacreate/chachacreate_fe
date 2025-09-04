// src/shared/areas/navigation/features/searchbar/Searchbar.tsx
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type SearchbarProps = {
  placeholder?: string;
  /** 폼 외부 래퍼 클래스 (form에 적용) */
  className?: string;

  /** 스타일 변형: 기본/네브(어두운 배경) */
  variant?: "default" | "navDark";

  /** 세부 오버라이드 (원하면 개별적으로 커스터마이즈 가능) */
  wrapperClassName?: string;   // 인풋 래퍼(div)
  inputClassName?: string;     // 인풋 자체
  buttonClassName?: string;    // 버튼
  hideButton?: boolean;        // 버튼 숨김 (네브에서는 보통 숨김)
};

export default function Searchbar({
  placeholder = "작품, 스토어를 검색해보세요",
  className = "",
  variant = "default",
  wrapperClassName = "",
  inputClassName = "",
  buttonClassName = "",
  hideButton = false,
}: SearchbarProps) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();

    const query = q.trim();
    if (!query) return;

    if (query.startsWith("@")) {
      const slug = query.slice(1).replace(/\s+/g, "");
      if (slug) navigate(`/${slug}`);
      return;
    }

    navigate(`/main/search?q=${encodeURIComponent(query)}`, {
      state: { from: location.pathname },
    });
  };

  const isNav = variant === "navDark";

  const wrapperBase =
    "flex items-center gap-2 rounded-full px-3 min-w-0 transition-colors";
  const wrapperVariant = isNav
    ? // 요청하신 네브 스타일: 반투명 배경/보더 + focus시 진하게
      "h-[34px] bg-white/10 border border-white/20 text-white focus-within:bg-white/20 focus-within:border-white/40"
    : // 기존 기본 스타일 유지
      "h-9 border border-gray-300 bg-white shadow-sm text-gray-700";

  const inputBase =
    "w-full min-w-0 bg-transparent text-sm caret-[#2d4739] outline-none ring-0 focus:outline-none";
  const inputVariant = isNav
    ? "text-white placeholder-white/60"
    : "text-gray-900 placeholder-gray-400";

  const buttonBase = "shrink-0 rounded-full px-3 py-1 text-sm transition-opacity";
  const buttonVariant = isNav
    ? "bg-white/20 text-white hover:bg-white/30"
    : "bg-[#2d4739] text-white hover:opacity-90";

  return (
    <form onSubmit={onSubmit} className={`w-full min-w-0 ${className}`}>
      <label htmlFor="global-search" className="sr-only">
        검색
      </label>

      <div className={`${wrapperBase} ${wrapperVariant} ${wrapperClassName}`}>
        {/* 돋보기 아이콘 (색상은 현재 텍스트색을 따라갑니다) */}
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23C16 6.01 13.99 4 11.5 4S7 6.01 7 9.5 9.01 15 11.5 15c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 19.49 21.49 18 15.5 14Zm-4 0C9.01 14 7 11.99 7 9.5S9.01 5 11.5 5 16 7.01 16 9.5 13.99 14 11.5 14Z" />
        </svg>

        <input
          id="global-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={`${inputBase} ${inputVariant} ${inputClassName}`}
          aria-label="검색"
        />

        {!hideButton && (
          <button
            type="submit"
            className={`${buttonBase} ${buttonVariant} ${buttonClassName}`}
          >
            검색
          </button>
        )}
      </div>
    </form>
  );
}
