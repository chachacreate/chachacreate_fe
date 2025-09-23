// src/domains/buyer/areas/info/pages/StoreInfo.tsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { legacyGet } from '@src/libs/request';
import {
  Mail,
  Phone,
  User,
  Store as StoreIcon,
  RefreshCw,
  Info,
  Sparkles,
  Award,
  Calendar,
} from 'lucide-react';

// ✅ 레이아웃 컴포넌트
import Header from '@src/shared/areas/layout/features/header/Header';
import Storenavbar from '@src/shared/areas/navigation/features/navbar/store/Storenavbar';
import Footer from '@src/shared/areas/layout/features/footer/Footer';

type SellerInfo = {
  sellerName?: string | null;
  sellerPhone?: string | null;
  sellerEmail?: string | null;
  sellerProfile?: string | null;
};

type StoreInfoT = {
  storeName?: string | null;
  storeDetail?: string | null;
  logoImg?: string | null;
};

type LegacyInfoResponse = {
  status?: number;
  message?: string;
  data: {
    storeInfoList: StoreInfoT[];
    sellerInfoList: SellerInfo[];
  };
};

function useStoreSegment() {
  const { storeUrl, store } = useParams<{ storeUrl?: string; store?: string }>();
  const location = useLocation();
  return useMemo(
    () => storeUrl ?? store ?? (location.pathname.split('/')[1] || 'main'),
    [storeUrl, store, location.pathname]
  );
}

export default function StoreInfo() {
  const segment = useStoreSegment();

  const [storeInfo, setStoreInfo] = useState<StoreInfoT | null>(null);
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const fetchInfo = async () => {
    try {
      setLoading(true);
      setErr(null);
      const res = await legacyGet<LegacyInfoResponse>(`/${segment}/info`);
      const sInfo = res?.data?.storeInfoList?.[0] ?? null;
      const selInfo = res?.data?.sellerInfoList?.[0] ?? null;
      setStoreInfo(sInfo);
      setSellerInfo(selInfo);
    } catch (e) {
      console.error('스토어 정보 불러오기 실패', e);
      setErr('스토어 정보를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
    // 페이지 진입 애니메이션 트리거
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [segment]);

  const safe = (v?: string | null, fallback = '-') =>
    v && v.trim().length > 0 ? v : fallback;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* ✅ 상단 */}
      <Header />
      <Storenavbar />

      {/* 배경 장식 요소들 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-indigo-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-bl from-emerald-400/5 to-teal-400/5 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      {/* ✅ 본문 */}
      <main className="flex-1 w-full relative z-10">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-[240px]">
          <div className={`mx-auto max-w-[1440px] py-8 sm:py-10 lg:py-12 transition-all duration-1000 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            
            {/* 제목 섹션 - 개선된 디자인 */}
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-3 mb-4 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-white/30 shadow-lg">
                <Sparkles className="h-5 w-5 text-blue-500 animate-pulse" />
                <span className="text-sm font-medium text-gray-600 tracking-wide">Store Information</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-[#2d4739] to-indigo-800 bg-clip-text text-transparent mb-3">
                스토어 정보
              </h1>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                판매자와 스토어에 대한 상세한 정보를 확인하세요
              </p>
            </div>

            {/* 헤더 카드 - 대폭 개선 */}
<div className={`group relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-sm border border-[#2d4739]/20 shadow-xl hover:shadow-2xl hover:border-[#2d4739]/40 transition-all duration-700 mb-8 ${
  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
}`} style={{ animationDelay: '200ms' }}>
  
  {/* 카드 배경 그라데이션 */}
  <div className="absolute inset-0 bg-gradient-to-r from-[#2d4739]/5 via-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
  
  <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-10">
    
    {/* 로고 섹션 */}
    <div className="relative">
      <div className="h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-2xl border-2 border-[#2d4739]/30 shadow-xl bg-gradient-to-br from-white to-emerald-50 group-hover:scale-110 group-hover:border-[#2d4739]/50 transition-all duration-500">
        {loading ? (
          <div className="h-full w-full bg-gradient-to-br from-emerald-100 via-[#2d4739]/15 to-teal-200/30 animate-pulse" />
        ) : (
          <div className="relative h-full w-full">
            <img
              src={storeInfo?.logoImg || ''}
              alt="스토어 로고"
              className="h-full w-full object-cover transition-all duration-500 group-hover:scale-110"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* 로고 없을 때 기본 아이콘 */}
            {!storeInfo?.logoImg && (
              <div className="absolute inset-0 flex items-center justify-center">
                <StoreIcon className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 로고 장식 */}
      <div className="absolute -top-2 -right-2 h-6 w-6 bg-gradient-to-br from-[#2d4739] to-emerald-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
        <Award className="h-3 w-3 text-white" />
      </div>
    </div>

    <div className="min-w-0 flex-1">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="space-y-3">
              <div className="h-8 w-64 animate-pulse rounded-2xl bg-gradient-to-r from-emerald-100 to-[#2d4739]/15" />
              <div className="h-6 w-32 animate-pulse rounded-xl bg-gradient-to-r from-[#2d4739]/15 to-teal-200/40" />
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 group-hover:text-[#2d4739] transition-colors duration-300">
                {safe(storeInfo?.storeName, '스토어명 없음')}
              </h2>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-text-[#2d4739] border border-emerald-500/50">
                  @{segment}
                </span>
                <div className="flex items-center gap-1 text-emerald-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium">활성</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 새로고침 버튼 */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchInfo}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#2d4739] to-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 hover:from-[#2d4739]/90 hover:to-emerald-600 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
            disabled={loading}
            title="새로고침"
          >
            <RefreshCw className={`h-4 w-4 transition-transform duration-500 ${loading ? 'animate-spin' : 'group-hover/btn:rotate-180'}`} />
            새로고침
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

            {/* 에러 알림 - 개선된 스타일 */}
            {err && (
              <div className={`mb-6 flex items-start gap-4 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-pink-50 p-6 text-red-700 shadow-lg transition-all duration-500 ${
                isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
              }`}>
                <div className="flex-shrink-0 p-2 bg-red-100 rounded-xl">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">오류 발생</h4>
                  <p className="text-sm leading-relaxed">{err}</p>
                </div>
              </div>
            )}

            {/* 본문 그리드 */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              
              {/* 판매자 정보 카드 */}
              <div className={`group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg hover:shadow-xl transition-all duration-700 lg:col-span-1 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
              }`} style={{ animationDelay: '400ms' }}>
                
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative border-b border-gray-100 p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                  <h3 className="flex items-center gap-3 text-lg font-bold text-gray-800">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
                      <User className="h-5 w-5" />
                    </div>
                    판매자 정보
                  </h3>
                </div>
                
                <div className="relative p-6 space-y-6">
                  {/* 이름 */}
                  <div className="group/item flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50/50 transition-all duration-300">
                    <div className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl group-hover/item:scale-110 transition-transform duration-300">
                      <User className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 mb-1">이름</p>
                      {loading ? (
                        <div className="h-5 w-32 animate-pulse rounded-xl bg-gradient-to-r from-gray-100 to-gray-200" />
                      ) : (
                        <p className="font-semibold text-gray-800 group-hover/item:text-emerald-700 transition-colors duration-300">
                          {safe(sellerInfo?.sellerName, '정보 없음')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 연락처 */}
                  <div className="group/item flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50/50 transition-all duration-300">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl group-hover/item:scale-110 transition-transform duration-300">
                      <Phone className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 mb-1">연락처</p>
                      {loading ? (
                        <div className="h-5 w-40 animate-pulse rounded-xl bg-gradient-to-r from-gray-100 to-gray-200" />
                      ) : (
                        <p className="font-semibold text-gray-800 group-hover/item:text-blue-700 transition-colors duration-300">
                          {safe(sellerInfo?.sellerPhone, '-')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 이메일 */}
                  <div className="group/item flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50/50 transition-all duration-300">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl group-hover/item:scale-110 transition-transform duration-300">
                      <Mail className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 mb-1">이메일</p>
                      {loading ? (
                        <div className="h-5 w-48 animate-pulse rounded-xl bg-gradient-to-r from-gray-100 to-gray-200" />
                      ) : (
                        <p className="font-semibold text-gray-800 group-hover/item:text-purple-700 transition-colors duration-300 break-all">
                          {safe(sellerInfo?.sellerEmail, '-')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 스토어 소개 카드 */}
              <div className={`group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg hover:shadow-xl transition-all duration-700 lg:col-span-2 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
              }`} style={{ animationDelay: '600ms' }}>
                
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative border-b border-gray-100 p-6 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                  <h3 className="flex items-center gap-3 text-lg font-bold text-gray-800">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white">
                      <Info className="h-5 w-5" />
                    </div>
                    스토어 소개
                  </h3>
                </div>
                
                <div className="relative p-8">
                  {loading ? (
                    <div className="space-y-3">
                      <div className="h-6 w-full animate-pulse rounded-xl bg-gradient-to-r from-gray-100 to-gray-200" />
                      <div className="h-6 w-4/5 animate-pulse rounded-xl bg-gradient-to-r from-gray-100 to-gray-200" />
                      <div className="h-6 w-3/5 animate-pulse rounded-xl bg-gradient-to-r from-gray-100 to-gray-200" />
                      <div className="h-6 w-2/3 animate-pulse rounded-xl bg-gradient-to-r from-gray-100 to-gray-200" />
                    </div>
                  ) : (
                    <div className="prose prose-lg max-w-none">
                      <p className="whitespace-pre-wrap leading-relaxed text-gray-700 group-hover:text-gray-800 transition-colors duration-300">
                        {safe(storeInfo?.storeDetail, '스토어 소개가 아직 등록되지 않았습니다. 곧 업데이트 예정입니다.')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 판매자 이력 카드 */}
              <div className={`group relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg hover:shadow-xl transition-all duration-700 lg:col-span-3 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
              }`} style={{ animationDelay: '800ms' }}>
                
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-amber-500/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative border-b border-gray-100 p-6 bg-gradient-to-r from-orange-50/50 to-amber-50/50">
                  <h3 className="flex items-center gap-3 text-lg font-bold text-gray-800">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl text-white">
                      <Calendar className="h-5 w-5" />
                    </div>
                    판매자 이력
                  </h3>
                </div>
                
                <div className="relative p-8">
                  {loading ? (
                    <div className="space-y-4">
                      <div className="h-6 w-full animate-pulse rounded-xl bg-gradient-to-r from-gray-100 to-gray-200" />
                      <div className="h-6 w-5/6 animate-pulse rounded-xl bg-gradient-to-r from-gray-100 to-gray-200" />
                      <div className="h-6 w-4/6 animate-pulse rounded-xl bg-gradient-to-r from-gray-100 to-gray-200" />
                      <div className="h-6 w-3/6 animate-pulse rounded-xl bg-gradient-to-r from-gray-100 to-gray-200" />
                    </div>
                  ) : (
                    <div className="prose prose-lg max-w-none">
                      <p className="whitespace-pre-wrap leading-relaxed text-gray-700 group-hover:text-gray-800 transition-colors duration-300">
                        {safe(sellerInfo?.sellerProfile, '판매자 이력 정보가 아직 등록되지 않았습니다. 더 자세한 정보는 곧 업데이트될 예정입니다.')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 안내 메시지 - 개선된 디자인 */}
            <div className={`mt-12 flex items-center justify-center gap-3 text-gray-500 transition-all duration-1000 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`} style={{ animationDelay: '1000ms' }}>
              <div className="flex items-center gap-2 px-4 py-3 bg-white/60 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm">
                <div className="p-1 bg-blue-100 rounded-full">
                  <Info className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium">정보가 최신이 아니면 새로고침을 눌러 업데이트하세요</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ✅ 하단 */}
      <Footer />
    </div>
  );
}