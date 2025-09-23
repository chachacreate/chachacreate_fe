import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Star, ChevronRight } from 'lucide-react';
import Header from '@src/shared/areas/layout/features/header/Header';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';
import { get, patch } from '@src/libs/request';
import type { ApiResponse } from '@src/libs/apiResponse';

// ==== 타입 (필요시 프로젝트 공용 타입으로 이동 가능) ====
interface Product {
  id: string;
  title: string;
  category: string;
  price: number;
  imageUrl?: string;
  purchases?: number;
}
interface StoreCustomDTO {
  storeId: number;
  font?: { id: number; name: string; style: string; url: string } | null;
  icon?: { id: number; name: string; content: string; url: string } | null;
  fontColor: string;
  headerFooterColor: string;
  noticeColor: string;
  descriptionColor: string;
  popularColor: string; // ← heroBgColor와 매핑
  createdAt: string;
  updatedAt: string;
}
interface StoreSettings {
  fontId?: number; // ✅ 옵션 순서=ID
  iconId?: number; // ✅ 옵션 순서=ID
  fontColor: string;
  headerFooterBg: string;
  descriptionColor: string;
  noticeColor: string;
  heroBgColor: string; // 저장 시 popularColor로 저장
}

const fontOptions = [
  { value: "'Noto Sans KR', sans-serif", label: 'Noto Sans KR' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Nanum Gothic', sans-serif", label: 'Nanum Gothic' },
  { value: "'Open Sans', sans-serif", label: 'Open Sans' },
];

const iconOptions = [
  { value: 'star', label: 'Star Icon' },
  { value: 'heart', label: 'Heart Icon' },
  { value: 'bookmark', label: 'Bookmark Icon' },
];

const mockStoreInfo = {
  name: '라임스튜디오',
  logoUrl:
    'https://images.unsplash.com/photo-1522199710521-72d69614c702?q=80&w=800&auto=format&fit=crop',
  description:
    '핸드메이드 도자기와 자연 소재 소품을 만드는 라임스튜디오입니다. 따뜻한 일상을 전해드릴게요 🍋',
  noticeImportant:
    '추석 연휴(9/12~9/15) 기간 택배가 지연될 수 있습니다. 일정 여유를 두고 주문 부탁드립니다.',
  popularTop3: [
    {
      id: 'p1',
      title: '핸드메이드 머그 v2',
      category: '도자기',
      price: 29000,
      imageUrl:
        'https://images.unsplash.com/photo-1526045478516-99145907023c?q=80&w=800&auto=format&fit=crop',
      purchases: 412,
    },
    {
      id: 'p2',
      title: '너도밤나무 우드 트레이',
      category: '우드',
      price: 38000,
      imageUrl:
        'https://images.unsplash.com/photo-1595855759920-23405f1a0b1b?q=80&w=800&auto=format&fit=crop',
      purchases: 305,
    },
    {
      id: 'p3',
      title: '리넨 키친 클로스',
      category: '패브릭',
      price: 15000,
      imageUrl:
        'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?q=80&w=800&auto=format&fit=crop',
      purchases: 276,
    },
  ],
  featured3: [
    {
      id: 'f1',
      title: '생크림 화이트 플레이트',
      category: '도자기',
      price: 33000,
      imageUrl:
        'https://images.unsplash.com/photo-1543286386-2e659306cd6c?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 'f2',
      title: '월넛 조각 스푼',
      category: '우드',
      price: 12000,
      imageUrl:
        'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 'f3',
      title: '내추럴 테이블 매트',
      category: '패브릭',
      price: 19000,
      imageUrl:
        'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=800&auto=format&fit=crop',
    },
  ],
};

const formatPrice = (n: number) => n.toLocaleString('ko-KR') + '원';
const toHex6 = (v: string) => (v ? v.trim().toUpperCase() : v);

export default function StoreCustom() {
  const { storeUrl = 'main' } = useParams<{ storeUrl: string }>();

  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<StoreSettings>({
    fontId: undefined,
    iconId: undefined,
    fontColor: '#000000',
    headerFooterBg: '#676F58',
    descriptionColor: '#FFF6EE',
    noticeColor: '#FFF7DB',
    heroBgColor: '#FFF7DB', // = popularColor 기본값
  });

  // ===== 초기 로드(GET) =====
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res: ApiResponse<StoreCustomDTO> = await get<StoreCustomDTO>(
          `/api/seller/${storeUrl}/store/custom`
        );
        const d = res.data;
        if (mounted && d) {
          setSettings((prev) => ({
            ...prev,
            fontId: d.font?.id ?? prev.fontId,
            iconId: d.icon?.id ?? prev.iconId,
            fontColor: d.fontColor ?? prev.fontColor,
            headerFooterBg: d.headerFooterColor ?? prev.headerFooterBg,
            descriptionColor: d.descriptionColor ?? prev.descriptionColor,
            noticeColor: d.noticeColor ?? prev.noticeColor,
            heroBgColor: d.popularColor ?? prev.heroBgColor, // ✅ popular_color → heroBgColor
          }));
        }
      } catch {
        // 404 등: 최초 생성 전일 수 있음 → 무시
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [storeUrl]);

  // 미리보기용 폰트/아이콘 매핑 (옵션 순서=ID)
  const previewFontFamily =
    (settings.fontId && fontOptions[settings.fontId - 1]?.value) || "'Noto Sans KR', sans-serif";
  const previewIconType = (settings.iconId && iconOptions[settings.iconId - 1]?.value) || 'star';

  const themeVars = useMemo(
    () => ({
      ['--store-font-color']: settings.fontColor,
      ['--store-notice']: settings.noticeColor,
      ['--store-desc']: settings.descriptionColor,
      ['--store-header-bg']: settings.headerFooterBg,
      ['--store-hero-bg']: settings.heroBgColor,
      fontFamily: previewFontFamily,
      color: settings.fontColor,
    }),
    [settings, previewFontFamily]
  );

  const handleSelectId = (field: 'fontId' | 'iconId', value: string) => {
    setSettings((p) => ({ ...p, [field]: value ? Number(value) : undefined }));
  };
  const handleColor = (field: keyof StoreSettings, value: string) => {
    setSettings((p) => ({ ...p, [field]: value }));
  };

  // ===== 저장(PATCH) =====
  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        fontId: settings.fontId,
        iconId: settings.iconId,
        fontColor: toHex6(settings.fontColor),
        headerFooterColor: toHex6(settings.headerFooterBg),
        descriptionColor: toHex6(settings.descriptionColor),
        noticeColor: toHex6(settings.noticeColor),
        popularColor: toHex6(settings.heroBgColor), // ✅ hero → popular_color
      };
      const res: ApiResponse<StoreCustomDTO> = await patch<StoreCustomDTO>(
        `/api/seller/${storeUrl}/store/custom`,
        payload
      );
      const d = res.data;
      if (d) {
        setSettings((prev) => ({
          ...prev,
          fontId: d.font?.id ?? prev.fontId,
          iconId: d.icon?.id ?? prev.iconId,
          fontColor: d.fontColor ?? prev.fontColor,
          headerFooterBg: d.headerFooterColor ?? prev.headerFooterBg,
          descriptionColor: d.descriptionColor ?? prev.descriptionColor,
          noticeColor: d.noticeColor ?? prev.noticeColor,
          heroBgColor: d.popularColor ?? prev.heroBgColor,
        }));
      }
      alert(res.message || '저장 완료되었습니다.');
    } catch (e: any) {
      alert(
        e?.response?.data?.message ||
          e?.message ||
          '저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <SellerSidenavbar>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">스토어 정보 관리</h1>
              <p className="text-gray-600 mt-1">스토어와 판매자 정보를 관리하세요.</p>
            </div>
            {loading && <div className="text-sm text-gray-500">저장/불러오는 중…</div>}
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* 글꼴(ID) */}
            <div>
              <label className="block text-sm font-medium mb-1">글꼴 *</label>
              <select
                value={settings.fontId ?? ''}
                onChange={(e) => handleSelectId('fontId', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">선택하세요</option>
                {fontOptions.map((opt, idx) => (
                  <option key={opt.label} value={idx + 1}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 아이콘(ID) */}
            <div>
              <label className="block text-sm font-medium mb-1">아이콘 *</label>
              <select
                value={settings.iconId ?? ''}
                onChange={(e) => handleSelectId('iconId', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">선택하세요</option>
                {iconOptions.map((opt, idx) => (
                  <option key={opt.label} value={idx + 1}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 색상들 */}
            <div>
              <label className="block text-sm font-medium mb-1">글꼴 색상 *</label>
              <input
                type="color"
                value={settings.fontColor}
                onChange={(e) => handleColor('fontColor', e.target.value)}
                className="w-full h-10 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">헤더 & 풋터 색상 *</label>
              <input
                type="color"
                value={settings.headerFooterBg}
                onChange={(e) => handleColor('headerFooterBg', e.target.value)}
                className="w-full h-10 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">스토어 설명 색상 *</label>
              <input
                type="color"
                value={settings.descriptionColor}
                onChange={(e) => handleColor('descriptionColor', e.target.value)}
                className="w-full h-10 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">공지사항 색상 *</label>
              <input
                type="color"
                value={settings.noticeColor}
                onChange={(e) => handleColor('noticeColor', e.target.value)}
                className="w-full h-10 border rounded"
              />
            </div>

            {/* 요구사항: 인기&대표 색상 입력 제거 */}

            <div>
              <label className="block text-sm font-medium mb-1">히어로 배경 색상 *</label>
              <input
                type="color"
                value={settings.heroBgColor}
                onChange={(e) => handleColor('heroBgColor', e.target.value)}
                className="w-full h-10 border rounded"
              />
              <p className="mt-1 text-xs text-gray-400">
                * 이 값은 서버의 <code>popular_color</code> 컬럼으로 저장됩니다.
              </p>
            </div>

            <div className="md:col-span-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
              >
                저장하기
              </button>
            </div>
          </div>

          {/* Preview */}
          <PreviewArea themeVars={themeVars} storeUrl={storeUrl} iconType={previewIconType} />
        </div>
      </SellerSidenavbar>
    </>
  );
}

function PreviewArea({
  themeVars,
  storeUrl,
  iconType,
}: {
  themeVars: React.CSSProperties;
  storeUrl: string;
  iconType: string;
}) {
  return (
    <div className="w-full max-w-[1440px] mx-auto px-[240px]" style={themeVars}>
      {/* Hero Section */}
      <section className="w-full">
        <div className="w-full" style={{ backgroundColor: 'var(--store-hero-bg)' }}>
          <div className="h-[200px] sm:h-[240px] lg:h-[280px]" />
        </div>
        <div className="relative">
          <div className="-mt-[88px] sm:-mt-[100px]">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-start gap-6">
                <img
                  src={mockStoreInfo.logoUrl}
                  alt={`${mockStoreInfo.name} logo`}
                  className="w-20 h-20 rounded-xl object-cover border border-gray-200"
                />
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {mockStoreInfo.name}
                  </h1>
                  {mockStoreInfo.description && (
                    <p
                      className="mt-2 text-sm sm:text-base leading-relaxed"
                      style={{ color: 'var(--store-desc)' }}
                    >
                      {mockStoreInfo.description}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      to={`/${storeUrl}/products`}
                      className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                      style={{ backgroundColor: 'var(--store-desc)' }}
                    >
                      전체 상품 보기
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                    <Link
                      to={`/store/${storeUrl}/notices`}
                      className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50"
                    >
                      공지사항
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-6" />
          </div>
        </div>
      </section>

      {/* Notice */}
      {mockStoreInfo.noticeImportant && (
        <section className="w-full">
          <div className="rounded-xl border p-5 sm:p-6 bg-white">
            <div className="text-sm font-semibold mb-2" style={{ color: 'var(--store-notice)' }}>
              중요 공지사항
            </div>
            <p className="text-sm sm:text-base leading-relaxed">{mockStoreInfo.noticeImportant}</p>
          </div>
        </section>
      )}

      {/* Popular / Featured */}
      <StoreSection
        title="인기 상품 TOP 3"
        subtitle="구매수가 많은 상품을 모았어요"
        moreLink={`/store/${storeUrl}/products?sort=popular`}
      >
        <ProductGrid3
          products={mockStoreInfo.popularTop3}
          emptyLabel="인기 상품을 준비 중이에요"
          iconType={iconType}
        />
      </StoreSection>

      <StoreSection
        title="대표 상품"
        subtitle="판매자가 추천하는 스토어 대표작"
        moreLink={`/store/${storeUrl}/products?filter=featured`}
      >
        <ProductGrid3
          products={mockStoreInfo.featured3}
          emptyLabel="대표 상품을 곧 보여드릴게요"
          badge="대표"
          iconType={iconType}
        />
      </StoreSection>

      {/* Footer */}
      <footer className="mt-12 w-full" style={{ backgroundColor: 'var(--store-header-bg)' }}>
        <div className="w-full py-8 text-sm text-gray-500">
          © {new Date().getFullYear()} {mockStoreInfo.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function StoreSection(props: {
  title: string;
  subtitle?: string;
  moreLink?: string;
  children: React.ReactNode;
}) {
  const { title, subtitle, moreLink, children } = props;
  return (
    <section className="w-full mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {moreLink && (
          <Link
            to={moreLink}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            더 보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ProductGrid3({
  products,
  emptyLabel,
  badge,
  iconType,
}: {
  products: Product[];
  emptyLabel: string;
  badge?: string;
  iconType: string;
}) {
  if (!products || products.length === 0) return <EmptyProducts label={emptyLabel} />;

  const items: (Product | null)[] = [...products];
  while (items.length < 3) items.push(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
      {items.map((p, idx) =>
        p ? (
          <ProductCard key={p.id} product={p} badge={badge} iconType={iconType} />
        ) : (
          <PlaceholderCard key={`placeholder-${idx}`} />
        )
      )}
    </div>
  );
}

function ProductCard({
  product,
  badge,
  iconType,
}: {
  product: Product;
  badge?: string;
  iconType: string;
}) {
  const getIcon = () => {
    switch (iconType) {
      case 'heart':
        return (
          <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
          </svg>
        );
      case 'bookmark':
        return (
          <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
        );
      default:
        return <Star className="w-3.5 h-3.5 text-yellow-500" />;
    }
  };

  return (
    <Link
      to={`./product/${product.id}`}
      className="group block rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow bg-white"
    >
      <div className="relative aspect-[4/3] bg-gray-50">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-400">
            이미지 준비 중
          </div>
        )}
        {badge && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 border border-gray-200 px-2.5 py-1 text-xs font-medium">
            {getIcon()}
            {badge}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold truncate">{product.title}</h3>
          <span className="text-sm font-bold">{formatPrice(product.price)}</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">{product.category}</p>
        {typeof product.purchases === 'number' && (
          <p className="mt-2 text-xs text-gray-400">누적 {product.purchases.toLocaleString()}개</p>
        )}
      </div>
    </Link>
  );
}

function PlaceholderCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-dashed border-gray-200 bg-white">
      <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center text-gray-400">
        곧 공개될 상품
      </div>
      <div className="p-4">
        <div className="h-4 w-1/2 bg-gray-100 rounded" />
        <div className="mt-2 h-3 w-1/3 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

function EmptyProducts({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-6 text-center text-gray-500">{label}</div>
  );
}
