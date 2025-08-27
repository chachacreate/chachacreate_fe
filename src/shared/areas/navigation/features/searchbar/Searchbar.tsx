// src/shared/areas/navigation/features/searchbar/Searchbar.tsx
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type SearchbarProps = {
  placeholder?: string;
  className?: string;
};

export default function Searchbar({
  placeholder = "작품, 스토어를 검색해보세요",
  className = "",
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

  return (
    <form onSubmit={onSubmit} className={`w-full min-w-0 ${className}`}>
      <label htmlFor="global-search" className="sr-only">검색</label>

      <div className="flex h-9 items-center gap-2 rounded-full border border-gray-300 bg-white px-3 shadow-sm min-w-0 text-gray-700">
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23C16 6.01 13.99 4 11.5 4S7 6.01 7 9.5 9.01 15 11.5 15c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 19.49 21.49 18 15.5 14Zm-4 0C9.01 14 7 11.99 7 9.5S9.01 5 11.5 5 16 7.01 16 9.5 13.99 14 11.5 14Z" />
        </svg>

        <input
          id="global-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 caret-[#2d4739] outline-none ring-0 focus:outline-none"
          autoComplete="off"
        />

        <button
          type="submit"
          className="shrink-0 rounded-full bg-[#2d4739] px-3 py-1 text-sm text-white hover:opacity-90"
        >
          검색
        </button>
      </div>
    </form>
  );
}