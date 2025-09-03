import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Star, ChevronRight } from 'lucide-react';
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';

interface Product {
  id: string;
  title: string;
  category: string;
  price: number;
  imageUrl?: string;
  purchases?: number;
}

interface StoreSettings {
  fontFamily: string;
  fontColor: string;
  headerFooterBg: string;
  descriptionColor: string;
  noticeColor: string;
  highlightColor: string;
  heroBgColor: string;
  iconType: string;
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
  logoUrl: 'https://images.unsplash.com/photo-1522199710521-72d69614c702?q=80&w=800&auto=format&fit=crop',
  description: '핸드메이드 도자기와 자연 소재 소품을 만드는 라임스튜디오입니다. 따뜻한 일상을 전해드릴게요 🍋',
  noticeImportant: '추석 연휴(9/12~9/15) 기간 택배가 지연될 수 있습니다. 일정 여유를 두고 주문 부탁드립니다.',
  popularTop3: [
    {
      id: 'p1',
      title: '핸드메이드 머그 v2',
      category: '도자기',
      price: 29000,
      imageUrl: 'https://images.unsplash.com/photo-1526045478516-99145907023c?q=80&w=800&auto=format&fit=crop',
      purchases: 412,
    },
    {
      id: 'p2',
      title: '너도밤나무 우드 트레이',
      category: '우드',
      price: 38000,
      imageUrl: 'https://images.unsplash.com/photo-1595855759920-23405f1a0b1b?q=80&w=800&auto=format&fit=crop',
      purchases: 305,
    },
    {
      id: 'p3',
      title: '리넨 키친 클로스',
      category: '패브릭',
      price: 15000,
      imageUrl: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?q=80&w=800&auto=format&fit=crop',
      purchases: 276,
    },
  ],
  featured3: [
    {
      id: 'f1',
      title: '생크림 화이트 플레이트',
      category: '도자기',
      price: 33000,
      imageUrl: 'https://images.unsplash.com/photo-1543286386-2e659306cd6c?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 'f2',
      title: '월넛 조각 스푼',
      category: '우드',
      price: 12000,
      imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 'f3',
      title: '내추럴 테이블 매트',
      category: '패브릭',
      price: 19000,
      imageUrl: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=800&auto=format&fit=crop',
    },
  ],
};

const formatPrice = (n: number) => n.toLocaleString('ko-KR') + '원';

export default function StoreCustom() {
  const { storeUrl = 'main' } = useParams<{ storeUrl: string }>();

  const defaultSettings: StoreSettings = {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontColor: '#1f2937',
    headerFooterBg: '#FDFAF2',
    descriptionColor: '#4b5563',
    noticeColor: '#7A241F',
    highlightColor: '#2D4739',
    heroBgColor: '#F3F0E8',
    iconType: 'star',
  };

  // Initialize settings from localStorage based on storeUrl
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const savedSettings = localStorage.getItem(`storeSettings_${storeUrl}`);
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  });

  const themeVars = useMemo(
    () => ({
      ['--store-font-color']: settings.fontColor,
      ['--store-highlight']: settings.highlightColor,
      ['--store-notice']: settings.noticeColor,
      ['--store-desc']: settings.descriptionColor,
      ['--store-header-bg']: settings.headerFooterBg,
      ['--store-hero-bg']: settings.heroBgColor,
      fontFamily: settings.fontFamily,
      color: settings.fontColor,
    }),
    [settings]
  );

  const handleInputChange = (field: keyof StoreSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    localStorage.setItem(`storeSettings_${storeUrl}`, JSON.stringify(settings));
    alert('설정이 저장되었습니다. 스토어 페이지에서 확인할 수 있습니다.');
  };

  return (
    <>
      <Header />
      <Mainnavbar />
      <SellerSidenavbar>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">스토어 정보 관리</h1>
              <p className="text-gray-600 mt-1">스토어와 판매자 정보를 관리하세요.</p>
            </div>
          </div>

          {/* Customization Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium mb-1">글꼴 종류 *</label>
              <select
                value={settings.fontFamily}
                onChange={(e) => handleInputChange('fontFamily', e.target.value)}
                className="w-full p-2 border rounded"
              >
                {fontOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">글꼴 색상 *</label>
              <input
                type="color"
                value={settings.fontColor}
                onChange={(e) => handleInputChange('fontColor', e.target.value)}
                className="w-full h-10 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">헤더 & 풋터 색상 *</label>
              <input
                type="color"
                value={settings.headerFooterBg}
                onChange={(e) => handleInputChange('headerFooterBg', e.target.value)}
                className="w-full h-10 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">스토어 설명 색상 *</label>
              <input
                type="color"
                value={settings.descriptionColor}
                onChange={(e) => handleInputChange('descriptionColor', e.target.value)}
                className="w-full h-10 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">공지사항 색상 *</label>
              <input
                type="color"
                value={settings.noticeColor}
                onChange={(e) => handleInputChange('noticeColor', e.target.value)}
                className="w-full h-10 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">인기상품 & 대표상품 색상 *</label>
              <input
                type="color"
                value={settings.highlightColor}
                onChange={(e) => handleInputChange('highlightColor', e.target.value)}
                className="w-full h-10 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">히어로 배경 색상 *</label>
              <input
                type="color"
                value={settings.heroBgColor}
                onChange={(e) => handleInputChange('heroBgColor', e.target.value)}
                className="w-full h-10 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">아이콘 종류 *</label>
              <select
                value={settings.iconType}
                onChange={(e) => handleInputChange('iconType', e.target.value)}
                className="w-full p-2 border rounded"
              >
                {iconOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <button
                onClick={handleSave}
                className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                저장하기
              </button>
            </div>
          </div>

          {/* Preview Section */}
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
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{mockStoreInfo.name}</h1>
                        {mockStoreInfo.description && (
                          <p className="mt-2 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--store-desc)' }}>
                            {mockStoreInfo.description}
                          </p>
                        )}
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Link
                            to={`/${storeUrl}/products`}
                            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                            style={{ backgroundColor: 'var(--store-highlight)' }}
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

            {/* Notice Section */}
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

            {/* Popular Products */}
            <StoreSection
              title="인기 상품 TOP 3"
              subtitle="구매수가 많은 상품을 모았어요"
              highlight="var(--store-highlight)"
              moreLink={`/store/${storeUrl}/products?sort=popular`}
            >
              <ProductGrid3 products={mockStoreInfo.popularTop3} emptyLabel="인기 상품을 준비 중이에요" iconType={settings.iconType} />
            </StoreSection>

            {/* Featured Products */}
            <StoreSection
              title="대표 상품"
              subtitle="판매자가 추천하는 스토어 대표작"
              highlight="var(--store-highlight)"
              moreLink={`/store/${storeUrl}/products?filter=featured`}
            >
              <ProductGrid3 products={mockStoreInfo.featured3} emptyLabel="대표 상품을 곧 보여드릴게요" badge="대표" iconType={settings.iconType} />
            </StoreSection>

            {/* Footer */}
            <footer className="mt-12 w-full" style={{ backgroundColor: 'var(--store-header-bg)' }}>
              <div className="w-full py-8 text-sm text-gray-500">
                © {new Date().getFullYear()} {mockStoreInfo.name}. All rights reserved.
              </div>
            </footer>
          </div>
        </div>
      </SellerSidenavbar>
    </>
  );
}

function StoreSection(props: {
  title: string;
  subtitle?: string;
  highlight?: string;
  moreLink?: string;
  children: React.ReactNode;
}) {
  const { title, subtitle, highlight = '#2D4739', moreLink, children } = props;
  return (
    <section className="w-full mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: highlight }}>
            {title}
          </h2>
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
        p ? <ProductCard key={p.id} product={p} badge={badge} iconType={iconType} /> : <PlaceholderCard key={`placeholder-${idx}`} />
      )}
    </div>
  );
}

function ProductCard({ product, badge, iconType }: { product: Product; badge?: string; iconType: string }) {
  const getIcon = () => {
    switch (iconType) {
      case 'heart':
        return <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>;
      case 'bookmark':
        return <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>;
      default:
        return <Star className="w-3.5 h-3.5 text-yellow-500" />;
    }
  };

  return (
    <Link to={`./product/${product.id}`} className="group block rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow bg-white">
      <div className="relative aspect-[4/3] bg-gray-50">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-400">이미지 준비 중</div>
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
      <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center text-gray-400">곧 공개될 상품</div>
      <div className="p-4">
        <div className="h-4 w-1/2 bg-gray-100 rounded" />
        <div className="mt-2 h-3 w-1/3 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

function EmptyProducts({ label }: { label: string }) {
  return <div className="rounded-xl border border-gray-200 p-6 text-center text-gray-500">{label}</div>;
}