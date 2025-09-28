// src/domains/buyer/areas/store/features/main-landing/StoreClassesPage.tsx
import storeHero from '@src/domains/buyer/areas/classes/assets/store-hero.png';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
import Storenavbar from '@src/shared/areas/navigation/features/navbar/store/Storenavbar';
import Searchbar from '@src/shared/areas/navigation/features/searchbar/Searchbar';
import { get, legacyGet } from '@src/libs/request'; 
import type { ApiResponse } from '@src/libs/apiResponse';

// 서버에서 응답하는 클래스 정보 타입
type ClassItem = {
  id: number;
  title: string;
  thumbnailUrl?: string;
  storeName: string;
  addressRoad: string;
  price: number;
  remainSeat: number;
  startDate: string; 
  endDate: string;  
};

// 서버에서 응답하는 클래스 목록 + 페이지 정보 타입
type ClassListResponse = {
  content: ClassItem[];
  page: number;        
  size: number;
  totalElements: number;
  totalPages: number;  // 0개여도 최소 1로 표시(UX)
  last: boolean;
};

/** 정렬 키 (UI 선택값) */
type SortKey = 'latest' | 'closing' | 'priceAsc' | 'priceDesc';

/** 정렬 키 → 서버 sort 파라미터 매핑 */
const SORT_MAP: Record<SortKey, string> = {
  latest: 'latest',
  closing: 'end_date',
  priceAsc: 'price_low',
  priceDesc: 'price_high',
};

/** 1페이지에 보여줄 카드 개수 (서버 size와 동일하게 유지) */
const PAGE_SIZE = 16;

/** 이미지 없을 때 대체 썸네일 */
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='160'>
      <rect width='100%' height='100%' fill='%23f3f4f6'/>
      <text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-size='14' fill='%239ca3af'>NO IMAGE</text>
    </svg>`
  );

// 커스텀 설정 타입
interface StoreCustomDTO {
  storeId: number;
  font?: { id: number; name: string; style: string; url: string } | null;
  icon?: { id: number; name: string; content: string; url: string } | null;
  fontColor: string;
  headerFooterColor: string;
  noticeColor: string;
  descriptionColor: string;
  popularColor: string; // 이 값을 배너 배경으로 사용
  createdAt: string;
  updatedAt: string;
}

// 페이지 컴포넌트
export default function StoreClassesPage() {
  const { store } = useParams<{ store: string }>();
  const storeUrl = store ?? '';   

  const [storeName, setStoreName] = useState<string>("");
  const [customSettings, setCustomSettings] = useState<StoreCustomDTO | null>(null);

  // RGB 색상을 CSS 형식으로 변환하는 함수
  const convertColorToCss = (color: string): string => {
    if (!color) return '#5B7A67'; // 기본값
    
    // 이미 hex 형식이면 그대로 반환
    if (color.startsWith('#')) {
      return color;
    }
    
    // RGB 형식 (예: "252,92,92")을 css rgb() 형식으로 변환
    if (color.includes(',')) {
      const rgbValues = color.split(',').map(v => v.trim());
      if (rgbValues.length === 3) {
        return `rgb(${rgbValues.join(', ')})`;
      }
    }
    
    // 기타 형식이면 기본값 반환
    return '#5B7A67';
  };

  // 커스텀 설정 로드 함수
  const loadCustomSettings = async () => {
    try {
      const result: ApiResponse<StoreCustomDTO> = await get<StoreCustomDTO>(
        `/api/seller/${storeUrl}/store/custom`
      );
      setCustomSettings(result.data);
      console.log('클래스 페이지 커스텀 설정 로드:', result.data);
    } catch (error) {
      console.warn('커스텀 설정이 없거나 로드 실패, 기본값 사용:', error);
    }
  };

  // 배너 배경색 결정
  const bannerBgColor = customSettings?.popularColor 
    ? convertColorToCss(customSettings.popularColor) 
    : '#5B7A67';

  // storeName과 커스텀 설정 불러오기
  useEffect(() => {
    const fetchStoreInfo = async () => {
      try {
        const res = await legacyGet<any>(`/${storeUrl}/info`);
        const name = res?.data?.storeInfoList?.[0]?.storeName ?? '';
        setStoreName(name);
      } catch (err) {
        console.error('스토어 정보 요청 실패', err);
      }
    };

    if (storeUrl) {
      fetchStoreInfo();
      loadCustomSettings();
    }
  }, [storeUrl]);

  //배너 애니메이션
  const bannerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, when: 'beforeChildren' },
    },
  };

  const slideLeft = {
    hidden: { opacity: 0, x: -24 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const slideRight = {
    hidden: { opacity: 0, x: 24 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  // 데이터 & 상태
  const [items, setItems] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 검색/정렬/페이지
  const [keyword, setKeyword] = useState<string>('');             // 서버에 보낼 검색어(제출된 값)
  const [sortKey, setSortKey] = useState<SortKey>('latest');      // 서버에 보낼 정렬 키
  const [page, setPage] = useState<number>(0);                    // 서버 0-base 페이지
  const [totalPages, setTotalPages] = useState<number>(1);        // 서버 총 페이지수

  // Searchbar 이벤트 가로채기용 ref & 초기화용 key
  const searchbarWrapRef = useRef<HTMLDivElement | null>(null);   // <form> 요소 접근용
  const [searchbarKey, setSearchbarKey] = useState(0);            // 강제 리마운트로 내부 입력 초기화
  const initRanRef = useRef(false);                               // 초기 로딩 로직이 한 번만 실행되도록 보장

  // 마지막 사용자 액션 추적: 'pagination' | 'sort' | 'search' | null
  const lastActionRef = useRef<'pagination' | 'sort' | 'search' | null>(null);

  // 이번 page 변경이 "정렬로 인한 리셋"인지 표시
  const fromSortRef = useRef<boolean>(false);

  // 공통 스크롤 헬퍼
  const scrollToAnchor = (id: string, offset = 80) => {
    const anchor = document.getElementById(id);
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const top = window.scrollY + rect.top - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  };

   // 서버에서 클래스 목록을 조회 (검색/정렬/페이지 지원)
  const fetchClasses = async (opts?: {
    keyword?: string;
    sortKey?: SortKey;
    page?: number; // 0-base
    size?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const kw = (opts?.keyword ?? keyword).trim();
      const sk = opts?.sortKey ?? sortKey;
      const pg = opts?.page ?? page;           // 0-base
      const sz = opts?.size ?? PAGE_SIZE;

      const res = await get<ClassListResponse>(`/${storeUrl}/classes`, {
        keyword: kw || undefined,              // 빈 문자열이면 파라미터 생략
        sort: SORT_MAP[sk],
        page: pg,                              // 0-base
        size: sz,
      });

      const data = res?.data;
      setItems(data?.content ?? []);
      setTotalPages(Math.max(1, data?.totalPages ?? 1)); // 0개여도 최소 1로 표시(UX)
    } catch (e) {
      console.error('❌ 클래스 목록 조회 실패:', e);
      setError('클래스 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

// 정렬 버튼 클릭 시 실행할 함수
const handleSortChange = (key: SortKey) => {
  // [ADDED] 이번 변화는 정렬 액션이며, 이어질 page=0 리셋은 "정렬로 인한 것"임을 표시
  lastActionRef.current = 'sort';
  fromSortRef.current = true;

  setSortKey(key); // 상태 변경만 담당

  // 정렬 전환 시 무조건 sort-section으로 스크롤 이동
  scrollToAnchor('sort-section', 80);
};

  // 최초 1회 로딩
  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;          // 초기 진입: page=0, keyword='', sortKey='latest'
    fetchClasses({ keyword: '', sortKey, page: 0 });
  }, [storeUrl]);

  // 정렬/스토어 변경 시 page=0으로 리셋 후 재조회
  useEffect(() => {
    if (!initRanRef.current) return;

    // [CHANGED] page가 이미 0이면 setPage(0)로 불필요한 page 변경을 유발하지 않게 함
    if (page !== 0) {
      setPage(0);
      // 이 경우 fetchClasses는 useEffect([page])에서 호출됨
    } else {
      // page가 0이면 바로 조회 (page useEffect를 트리거하지 않음)
      fetchClasses({ keyword, sortKey, page: 0 });
    }
  }, [sortKey, storeUrl]); // page는 의존성에 넣지 않음 (의도적으로)

  // 페이지 변경 시 재조회
  useEffect(() => {
    if (!initRanRef.current) return;

    fetchClasses({ page });

    // fromSortRef가 true면(정렬로 인한 page 변경) search-section 스크롤을 하지 않음
    if (fromSortRef.current) {
      // 다음 동작에 영향을 주지 않도록 즉시 리셋
      fromSortRef.current = false;
      lastActionRef.current = null;
      return;
    }

    // 마지막 액션이 페이지네이션일 때만 search-section으로 스크롤
    if (lastActionRef.current === 'pagination') {
      scrollToAnchor('search-section', 80);
    }

    // 플래그 리셋
    lastActionRef.current = null;
  }, [page]);

   // 내부 <input type="search"> 값을 읽어서 서버에 검색 요청
  const onSearchbarSubmitCapture = (keyword: React.FormEvent) => {
    keyword.preventDefault();   // SPA(Single Page Application)에서 페이지 새로고침 없이 검색 로직을 처리하기 위해 사용
    keyword.stopPropagation();  // 이벤트가 상위 요소로 전달되는 것을 방지

    // 이번 변화는 검색 액션임을 표시
    lastActionRef.current = 'search';
    fromSortRef.current = false;

    const input = searchbarWrapRef.current?.querySelector(
      'input[type="search"]'
    ) as HTMLInputElement | null;

    const kw = (input?.value ?? '').trim();
    setKeyword(kw);    // 서버에 보낼 검색어 상태 업데이트
    setPage(0);       // 검색어가 바뀌면 첫 페이지로
    fetchClasses({ keyword: kw, page: 0 });   // 입력한 검색어를 기반으로 서버에서 데이터를 가져오고, 검색 결과를 업데이트
  };

   // 초기화 버튼
   // 서버 데이터 초기화(키워드/정렬/page) + Searchbar 내부 입력 초기화(강제 리마운트)
  const onResetAll = () => {
    setKeyword('');
    setSortKey('latest');
    setPage(0);
    fetchClasses({ keyword: '', sortKey: 'latest', page: 0 });

    // Searchbar는 내부 state로 input 제어 → key를 바꿔 강제 리마운트하면 입력 초기화
    setSearchbarKey((k) => k + 1);
  };

  // items를 저장하고 변경되지 않으면 이전에 계산된 값을 재사용
  // (불필요한 렌더링 방지 목적)
  const displayedItems = useMemo(() => items, [items]);

  // 로딩/에러 UI
  if (loading) {
    return (
      <>
        <Header />
        <Storenavbar />
        <div className="p-6 text-center text-gray-500">불러오는 중...</div>
      </>
    );
  }
  if (error) {
    return (
      <>
        <Header />
        <Storenavbar />
        <div className="p-6 text-center text-red-500">{error}</div>
      </>
    );
  }

  return (
    <>
      <Header />
      <Storenavbar />

      

      {/* 1920 x 400 배너 - 반응형 개선 + 커스텀 배경색 적용 */}
      <section 
        className="w-full animate-fade-up"
        style={{ backgroundColor: bannerBgColor }}
      >
        <div className="mx-auto w-full max-w-[1920px] h-[300px] sm:h-[350px] md:h-[400px] flex items-center">
          {/* 내부 1440 + 좌우 패딩 */}
          <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-5 lg:px-8 h-full flex items-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 w-full h-full items-center">
              {/* 왼쪽: 이미지 */}
              <div className="w-full h-full flex items-center justify-center animate-fade-right [animation-delay:120ms] order-2 md:order-1">
                <img
                  src={storeHero}
                  alt="스토어 배너 이미지"
                  className="h-[180px] sm:h-[220px] md:h-[300px] lg:h-[400px] w-auto object-contain max-w-full"
                  loading="eager"
                />
              </div>

              {/* 오른쪽: 문구 */}
              <div className="w-full h-full flex items-center animate-fade-left [animation-delay:200ms] order-1 md:order-2">
                <div className="text-center md:text-left font-jua text-white w-full">
                  {/* 모바일 대응 텍스트 크기 */}
                  <p className="text-[22px] xs:text-[26px] sm:text-[32px] md:text-[36px] lg:text-[44px] xl:text-[52px] leading-tight px-2 sm:px-0">
                    <span className="text-white break-keep">
                      {storeName || storeUrl}
                    </span>
                    <span className="text-white">의</span>
                    <br className="hidden sm:block" />
                    <span className="sm:hidden"> </span>
                    <span className="text-white break-keep">
                      원데이 클래스를
                    </span>
                    <br className="hidden sm:block" />
                    <span className="sm:hidden"> </span>
                    <span className="text-white break-keep">
                      수강해보세요!
                    </span>
                  </p>
                  
                  {/* 모바일용 서브텍스트 (선택사항) */}
                  <div className="mt-3 sm:mt-4 md:hidden">
                    <p className="text-sm sm:text-base text-white/90 font-normal">
                      특별한 원데이 클래스 경험을 만나보세요
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="w-full">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-8 lg:px-12 xl:px-20 2xl:px-[240px]">
          {/* 검색 섹션: 페이지 전환 시 여기를 기준으로 스크롤 복구 */}
          <div id="search-section" className="py-4 lg:py-12" />

          {/* 검색바: Searchbar 원본 유지 + onSubmitCapture로 가로채기 + 초기화 버튼 옆 배치 */}
          <section className="mb-4">
            <div
              ref={searchbarWrapRef}                     // 내부 입력/submit 제어용
              onSubmitCapture={onSearchbarSubmitCapture} // Searchbar 내부 form submit 가로채기
              className="mx-auto w-full xl:max-w-[720px] flex items-center gap-2"
            >
              <Searchbar
                key={searchbarKey}                       // 강제 리마운트로 입력 초기화
                placeholder="클래스 검색 (예: 뜨개, 가죽, 도자기)"
                className="flex-1"                       // 옆 버튼과 가로 배치
              />

              <button
                type="button"
                onClick={onResetAll}
                className="h-9 px-3 rounded-full border border-gray-300 bg-white text-sm hover:bg-gray-50"
                aria-label="검색 초기화"
              >
                초기화
              </button>
            </div>
          </section>

          {/* 정렬바 (디자인/레이아웃 유지) */}
          <section className="mb-6">
            <div id="sort-section" className="w-full xl:max-w-[720px]">
              <SortBar sortKey={sortKey} onChange={handleSortChange} />
            </div>
          </section>

          {/* 리스트 (디자인/레이아웃 유지) */}
          <ListView items={displayedItems} />

          {/* 페이지네이션 (서버 totalPages 사용 / UI는 1-base) */}
          <Pagination
            page={page + 1}                // 1-base로 노출
            totalPages={totalPages}
            onChange={(p1) => {
              // 유효 범위만 이동(1-base → 0-base)
              if (p1 < 1 || p1 > totalPages) return;

              // 이번 변화는 페이지네이션 액션임을 표시
              lastActionRef.current = 'pagination';
              fromSortRef.current = false;

              setPage(p1 - 1);
            }}
          />
        </div>
      </main>
    </>
  );
}

// 하위 컴포넌트
function SortBar({sortKey,onChange,}: {
  sortKey: SortKey;
  onChange: (key: SortKey) => void;
}) {
  const items: { key: SortKey; label: string }[] = [
    { key: 'latest', label: '최신순' },
    { key: 'closing', label: '마감임박순' },
    { key: 'priceAsc', label: '낮은가격순' },
    { key: 'priceDesc', label: '높은가격순' },
  ];

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-flex items-center gap-2 border border-gray-200 rounded-full p-1 bg-white">
        {items.map((it) => {
          const active = it.key === sortKey;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={[
                'h-9 px-3 rounded-full text-sm font-medium transition-colors',
                active
                  ? 'bg-gray-900 text-white'
                  : 'bg-transparent text-gray-700 hover:bg-gray-100',
              ].join(' ')}
              aria-pressed={active}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ items }: { items: ClassItem[] }) {
  if (items.length === 0) {
    return (
      <div className="py-20 text-center text-gray-500">
        등록된 클래스가 없습니다.
      </div>
    );
  }

  return (
    <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((c) => (
        <Link
          key={c.id}
          to={`/main/classes/${c.id}`}
          state={{ item: c }}
          className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 rounded-2xl"
        >
          <article className="border border-gray-200 rounded-2xl overflow-hidden bg-white transition-shadow group-hover:shadow-md">
            <div className="aspect-[4/3] bg-gray-100">
              <img
                src={c.thumbnailUrl || PLACEHOLDER}
                alt={c.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            <div className="p-4">
              <h3 className="font-semibold line-clamp-1">{c.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{c.storeName}</p>
              <p className="text-sm text-gray-500">{c.addressRoad}</p>
              <p className="text-sm text-gray-500">
                {new Date(c.startDate).toLocaleDateString()} ~{' '}
                {new Date(c.endDate).toLocaleDateString()}
              </p>
              <p className="mt-2 font-bold">{c.price.toLocaleString()}원</p>

              <span
                className={[
                  'mt-2 inline-flex h-7 px-2 items-center justify-center rounded-md text-xs font-medium',
                  c.remainSeat > 0
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200',
                ].join(' ')}
              >
                {c.remainSeat > 0 ? `잔여석 ${c.remainSeat}명` : '마감'}
              </span>

              <span className="mt-3 ml-2 inline-flex h-9 px-3 items-center justify-center rounded-xl border border-gray-300 bg-white group-hover:bg-gray-50">
                자세히 보기
              </span>
            </div>
          </article>
        </Link>
      ))}
    </section>
  );
}

/**
 * 서버 페이지네이션 기반 UI
 * - page: 1-base로 노출 (내부 상태는 0-base)
 * - totalPages: 서버 값 그대로 사용(0일 때는 상위에서 1로 보정)
 */
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;                 // 1-base
  totalPages: number;
  onChange: (p: number) => void; // 1-base
}) {
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const pages = Array.from({ length: totalPages }).map((_, i) => i + 1);

  return (
    <nav
      className="mt-8 mb-16 flex items-center justify-center gap-2"
      aria-label="클래스 페이지네이션"
    >
      <button
        onClick={() => onChange(page - 1)}
        disabled={!canPrev}
        className={[
          'h-10 px-3 rounded-lg border',
          canPrev
            ? 'border-gray-300 hover:bg-gray-50'
            : 'border-gray-200 text-gray-400 cursor-not-allowed',
        ].join(' ')}
      >
        이전
      </button>

      <ul className="flex items-center gap-1">
        {pages.map((p) => {
          const active = p === page;
          return (
            <li key={p}>
              <button
                onClick={() => onChange(p)}
                className={[
                  'h-10 w-10 rounded-lg border text-sm font-medium',
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 hover:bg-gray-50',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                {p}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        onClick={() => onChange(page + 1)}
        disabled={!canNext}
        className={[
          'h-10 px-3 rounded-lg border',
          canNext
            ? 'border-gray-300 hover:bg-gray-50'
            : 'border-gray-200 text-gray-400 cursor-not-allowed',
        ].join(' ')}
      >
        다음
      </button>
    </nav>
  );
}