import { useState, useEffect, type JSX } from 'react';
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import { Star, ShoppingCart, CreditCard, Flag, Edit, Minus, Plus, ThumbsUp, X } from 'lucide-react';
import { get, legacyGet, legacyPost } from '@src/libs/request';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import Storenavbar from '@src/shared/areas/navigation/features/navbar/store/Storenavbar';
import { processContent, getContentCssClasses } from '@src/shared/util/contentUtil';

interface Product {
  id: string;
  name: string;
  price: number;
  thumbnailUrl: string;
  images: string[];
  storeName: string;
  storeId: string;
  storeUrl?: string;
  categories: string[];
  description: string;
  rating: number;
  reviewCount: number;
  isOwner: boolean;
}

interface Review {
  id: string;
  userName: string;
  createdAt: string;
  updatedAt?: string;
  rating: number;
  content: string;
  likes: number;
  isOwner: boolean;
  isLiked: boolean;
  isEdited: boolean;
}

// Product 매핑: 안전하게 mainThumbnailUrl 확인
const mapProduct = (api: any): Product => {
  const productDetail = api.productDetail || {};
  const main = api.mainThumbnailUrl ?? (api.thumbnailImageUrls && api.thumbnailImageUrls[0]) ?? '';
  const uniqueImages = [
    ...(main ? [main] : []),
    ...(Array.isArray(api.thumbnailImageUrls)
      ? api.thumbnailImageUrls.filter((url: string) => url && url !== main)
      : []),
  ];

  return {
    id: (productDetail.productId ?? '').toString(),
    name: productDetail.productName ?? '',
    price: productDetail.price ?? 0,
    thumbnailUrl: main,
    images: uniqueImages.length ? uniqueImages : main ? [main] : [],
    storeName: productDetail.storeName ?? '뜨락상회',
    storeId: (productDetail.storeId ?? '').toString(),
    storeUrl: productDetail.storeUrl,
    categories: [
      productDetail.typeCategoryName,
      productDetail.ucategoryName,
      productDetail.dcategoryName,
    ].filter(Boolean),
    description: productDetail.productDetail ?? '',
    rating: 0,
    reviewCount: 0,
    isOwner: false,
  };
};

const mapReview = (r: any): Review => ({
  id: r.id.toString(),
  userName: r.memberName,
  createdAt: r.reviewDate,
  updatedAt: r.updatedAt,
  rating: r.rating,
  content: r.content,
  likes: 0,
  isOwner: false,
  isLiked: false,
  isEdited: !!r.updatedAt,
});

const MainProductsDetail = () => {
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [canWriteReview, setCanWriteReview] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, content: '' });
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [editReviewData, setEditReviewData] = useState({ rating: 5, content: '' });

  const { productId } = useParams<{ productId: string }>();
  const storeUrl = 'hihiyaho';

  const [loadingProduct, setLoadingProduct] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const navigate = useNavigate();

  // 상품 상세 불러오기
  useEffect(() => {
    if (!storeUrl || !productId) return;

    const fetchProductDetail = async () => {
      try {
        const response = await legacyGet<any>(`/${storeUrl}/productdetail/${productId}`);

        if (response.status === 200) {
          const apiData = response?.data ?? response;
          const mappedProduct = mapProduct(apiData);
          setProduct(mappedProduct);
        } else {
          console.error('상품 불러오기 실패:', response.message);
        }
      } catch (error) {
        console.error('API 요청 실패:', error);
      } finally {
        setLoadingProduct(false);
      }
    };

    fetchProductDetail();
  }, [storeUrl, productId]);

  // 리뷰 평균 평점 계산
  const calculateAverageRating = (reviews: Review[]): number => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return parseFloat((sum / reviews.length).toFixed(1));
  };

  // 리뷰 불러오기
  useEffect(() => {
    if (!productId) return;

    const fetchReviews = async () => {
      try {
        const response = await get<any[]>(`/products/${productId}/reviews`);

        if (response.status === 200) {
          const mapped = response.data.map(mapReview);
          setReviews(mapped);

          setProduct((prev) =>
            prev
              ? {
                  ...prev,
                  rating: calculateAverageRating(mapped),
                  reviewCount: mapped.length,
                }
              : prev
          );
        } else {
          console.error('리뷰 조회 실패:', response.message);
          setReviews([]);
        }
      } catch (error: any) {
        console.error('API 요청 실패:', error);
        setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [productId]);

  // 상품 상세 설명을 위한 CSS 스타일 적용
  useEffect(() => {
    const addProductDescriptionStyles = () => {
      const existingStyle = document.getElementById('product-description-styles');
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'product-description-styles';
        style.textContent = `
          .product-description h1, .product-description h2, .product-description h3,
          .product-description h4, .product-description h5, .product-description h6 {
            font-weight: 600 !important;
            margin-top: 24px !important;
            margin-bottom: 16px !important;
            color: #1f2937 !important;
          }
          .product-description h1 { font-size: 32px !important; }
          .product-description h2 { font-size: 24px !important; }
          .product-description h3 { font-size: 20px !important; }
          .product-description h4 { font-size: 18px !important; }
          .product-description h5 { font-size: 16px !important; }
          .product-description h6 { font-size: 14px !important; }
          .product-description p {
            margin-bottom: 16px !important;
            line-height: 1.7 !important;
            color: #374151 !important;
          }
          .product-description ul, .product-description ol {
            margin-bottom: 16px !important;
            padding-left: 24px !important;
            color: #374151 !important;
          }
          .product-description li {
            margin-bottom: 8px !important;
            line-height: 1.6 !important;
          }
          .product-description strong {
            font-weight: 600 !important;
            color: #1f2937 !important;
          }
          .product-description em {
            font-style: italic !important;
            color: #1f2937 !important;
          }
        `;
        document.head.appendChild(style);
      }
    };

    addProductDescriptionStyles();
    return () => {
      const style = document.getElementById('product-description-styles');
      if (style) {
        style.remove();
      }
    };
  }, []);

  // product.images 변경 시 selected index 리셋
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product?.images.length]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const formatDate = (dateInput?: string | number) => {
    if (!dateInput) return '';
    const d = typeof dateInput === 'number' ? new Date(dateInput) : new Date(String(dateInput));
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  };

  const renderStars = (rating: number, size: 'small' | 'large' = 'small') => {
    const stars: JSX.Element[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const starSize = size === 'large' ? 'w-6 h-6' : 'w-4 h-4';

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className={`${starSize} fill-yellow-400 text-yellow-400`} />);
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" className={`relative ${starSize}`}>
          <Star className={`${starSize} text-gray-300`} />
          <div className="absolute top-0 left-0 overflow-hidden w-1/2">
            <Star className={`${starSize} fill-yellow-400 text-yellow-400`} />
          </div>
        </div>
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className={`${starSize} text-gray-300`} />);
    }

    return stars;
  };

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantity(newQuantity);
    }
  };

  const handleStoreClick = () => {
    if (product?.storeUrl == null) {
      navigate('/main');
    } else {
      navigate(`/${product?.storeUrl}/info`);
    }
  };

  const handleReport = () => {
    if (reportReason.trim()) {
      alert('신고가 접수되었습니다.');
      setIsReportModalOpen(false);
      setReportReason('');
    }
  };

  const [showModal, setShowModal] = useState(false);

  const handleAddToCart = async () => {
    try {
      const response = await legacyPost<any>('/main/mypage/cart', {
        productId,
        productCnt: quantity,
      });

      if (response.status === 200) {
        setShowModal(true);
      } else {
        console.error('장바구니 추가 실패:', response.message);
        alert('장바구니 추가에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error: any) {
      console.error('API 호출 실패', error);
      if (error.code === 'ERR_BAD_REQUEST') {
        alert('로그인이 필요합니다!');
        window.location.href = `/auth/login`;
      } else {
        alert('장바구니 추가 중 오류가 발생했습니다.');
        navigate(`/main`);
      }
    }
  };

  const Modal = () =>
    showModal ? (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-80 text-center">
          <p className="mb-4">
            장바구니에 추가되었습니다.
            <br />
            장바구니로 이동하시겠습니까?
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate('/main/mypage/cart')}
              className="px-4 py-2 bg-[#2d4739] text-white rounded-lg hover:bg-[#2d4739]/90"
            >
              예
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
            >
              아니오
            </button>
          </div>
        </div>
      </div>
    ) : null;

  const handleBuyNow = () => {
    if (!product) return;

    const item = {
      productId: Number(product.id) || product.id,
      productName: product.name,
      productDetail: '',
      productCnt: quantity,
      price: product.price,
      pimgUrl: product.thumbnailUrl || product.images?.[0] || '',
      storeName: product.storeName,
      storeUrl: product.storeUrl ?? 'main',
      cartId: null,
    };

    sessionStorage.setItem('orderItems', JSON.stringify([item]));
    navigate('/main/order');
  };

  const handleSubmitReview = () => {
    if (newReview.content.trim()) {
      const review: Review = {
        id: `review-${Date.now()}`,
        userName: '현재 사용자',
        createdAt: new Date().toISOString(),
        rating: newReview.rating,
        content: newReview.content,
        likes: 0,
        isOwner: true,
        isLiked: false,
        isEdited: false,
      };
      setReviews((prev) => [review, ...prev]);
      setNewReview({ rating: 5, content: '' });
    }
  };

  const handleEditReview = (reviewId: string) => {
    const review = reviews.find((r) => r.id === reviewId);
    if (review) {
      setEditReviewData({ rating: review.rating, content: review.content });
      setEditingReview(reviewId);
    }
  };

  const handleUpdateReview = () => {
    if (editingReview && editReviewData.content.trim()) {
      setReviews((prev) =>
        prev.map((review) =>
          review.id === editingReview
            ? {
                ...review,
                rating: editReviewData.rating,
                content: editReviewData.content,
                updatedAt: new Date().toISOString(),
                isEdited: true,
              }
            : review
        )
      );
      setEditingReview(null);
      setEditReviewData({ rating: 5, content: '' });
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    if (confirm('리뷰를 삭제하시겠습니까?')) {
      setReviews((prev) => prev.filter((review) => review.id !== reviewId));
    }
  };

  const handleLikeReview = (reviewId: string) => {
    setReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              likes: review.isLiked ? review.likes - 1 : review.likes + 1,
              isLiked: !review.isLiked,
            }
          : review
      )
    );
  };

  const StarRatingInput = ({
    value,
    onChange,
    size = 'md',
  }: {
    value: number;
    onChange: (v: number) => void;
    size?: 'sm' | 'md' | 'lg';
  }) => {
    const sizeClass = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

    return (
      <div className="flex gap-1 select-none">
        {Array.from({ length: 5 }).map((_, idx) => {
          const i = idx + 1;
          const fillPct = Math.max(0, Math.min(1, value - (i - 1)));

          return (
            <span key={i} className={`relative inline-block ${sizeClass}`}>
              <Star className={`${sizeClass} text-gray-300`} />
              <span
                className="absolute top-0 left-0 overflow-hidden pointer-events-none"
                style={{ width: `${fillPct * 100}%` }}
              >
                <Star className={`${sizeClass} text-yellow-400 fill-yellow-400`} />
              </span>
              <button
                type="button"
                aria-label={`${i - 0.5}점`}
                onClick={() => onChange(i - 0.5)}
                className="absolute left-0 top-0 h-full w-1/2"
              />
              <button
                type="button"
                aria-label={`${i}점`}
                onClick={() => onChange(i)}
                className="absolute right-0 top-0 h-full w-1/2"
              />
            </span>
          );
        })}
      </div>
    );
  };

  if (loadingProduct || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4739]"></div>
      </div>
    );
  }

  const { pathname } = useLocation();
  const isMain = pathname.startsWith('/main');

  // 콘텐츠 처리를 렌더링 시점에서 직접 수행
  const processedContent = product.description ? processContent(product.description) : null;
  const sanitizedDescription = processedContent?.sanitizedDescription || '';
  const contentType = processedContent?.contentType || 'plain';
  const contentCssClasses = getContentCssClasses(contentType);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      {isMain ? <Mainnavbar /> : <Storenavbar />}

      <div className="max-w-screen-2xl mx-auto px-4 ">
        <div className="max-w-[1440px] mx-auto py-0 sm:py-8">
          {/* 상품 정보 섹션 */}
          <div className="bg-white rounded-lg shadow-sm hover:shadow-[0_6px_10px_rgba(0,0,0,0.15)] transition-shadow p-4 md:p-8 mb-8 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 이미지 섹션 */}
              <div className="space-y-4">
                <div className="w-full max-w-[400px] mx-auto aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={product.images[selectedImageIndex]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {product.images.length > 1 && (
                  <div className="flex gap-2 justify-center">
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                          selectedImageIndex === index ? 'border-[#2d4739]' : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 상품 정보 */}
              <div className="space-y-6">
                <div>
                  <button
                    onClick={handleStoreClick}
                    className="text-[#2d4739] hover:text-[#1a2e20] font-medium"
                  >
                    {product.storeName}
                  </button>
                </div>

                <div className="flex items-start justify-between">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex-1">
                    {product.name}
                  </h1>
                  <div className="flex-shrink-0 ml-4">
                    {product.isOwner ? (
                      <button className="flex items-center gap-1 text-gray-600 hover:text-[#2d4739]">
                        <Edit className="w-5 h-5" />
                        <span className="hidden sm:inline">수정</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="flex items-center gap-1 text-gray-600 hover:text-red-600"
                      >
                        <Flag className="w-5 h-5" />
                        <span className="hidden sm:inline">신고</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {product.categories.map((category, index) => (
                    <span
                      key={index}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      {category}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {renderStars(product.rating, 'large')}
                  </div>
                  <span className="text-xl font-semibold">{product.rating}</span>
                  <span className="text-gray-600">({product.reviewCount}개 리뷰)</span>
                </div>

                <div className="py-4 border-t border-b border-gray-200">
                  <p className="text-3xl font-bold text-[#2d4739]">
                    {formatPrice(product.price)}원
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-900">수량:</span>
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                        className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-4 py-2 min-w-[60px] text-center font-medium">
                        {quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= 99}
                        className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-lg font-semibold text-gray-900">
                    총 가격:{' '}
                    <span className="text-[#2d4739]">
                      {formatPrice(product.price * quantity)}원
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAddToCart}
                    className="flex items-center justify-center gap-2 flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    장바구니
                  </button>
                  <Modal />
                  <button
                    onClick={handleBuyNow}
                    className="flex items-center justify-center gap-2 flex-1 bg-[#2d4739] hover:bg-[#1a2e20] text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    <CreditCard className="w-5 h-5" />
                    바로결제
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 상품 상세 설명 */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-8 mb-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">상품 상세정보</h2>

            <div className="text-gray-700">
              {product.description ? (
                <div
                  className="product-description"
                  dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                  style={{
                    lineHeight: '1.6',
                    fontSize: '16px',
                    color: '#374151',
                  }}
                />
              ) : (
                <div>
                  <p>상품 설명이 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          {/* 인라인 CSS 스타일 */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
              .product-description h1, .product-description h2, .product-description h3,
              .product-description h4, .product-description h5, .product-description h6 {
                font-weight: 600 !important;
                margin-top: 24px !important;
                margin-bottom: 16px !important;
                color: #1f2937 !important;
              }
              .product-description h1 { font-size: 32px !important; }
              .product-description h2 { font-size: 24px !important; }
              .product-description h3 { font-size: 20px !important; }
              .product-description h4 { font-size: 18px !important; }
              .product-description h5 { font-size: 16px !important; }
              .product-description h6 { font-size: 14px !important; }
              .product-description p {
                margin-bottom: 16px !important;
                line-height: 1.7 !important;
                color: #374151 !important;
              }
              .product-description ul, .product-description ol {
                margin-bottom: 16px !important;
                padding-left: 24px !important;
                color: #374151 !important;
              }
              .product-description li {
                margin-bottom: 8px !important;
                line-height: 1.6 !important;
              }
              .product-description strong {
                font-weight: 600 !important;
                color: #1f2937 !important;
              }
              .product-description em {
                font-style: italic !important;
                color: #1f2937 !important;
              }
              .product-description code {
                background-color: #f3f4f6 !important;
                padding: 2px 6px !important;
                border-radius: 4px !important;
                font-size: 14px !important;
                color: #1f2937 !important;
              }
              .product-description pre {
                background-color: #f3f4f6 !important;
                padding: 16px !important;
                border-radius: 8px !important;
                overflow-x: auto !important;
                margin-bottom: 16px !important;
              }
              .product-description blockquote {
                border-left: 4px solid #d1d5db !important;
                padding-left: 16px !important;
                margin: 16px 0 !important;
                font-style: italic !important;
                color: #6b7280 !important;
              }
              .product-description a {
                color: #2563eb !important;
                text-decoration: none !important;
              }
              .product-description a:hover {
                color: #1d4ed8 !important;
                text-decoration: underline !important;
              }
              .product-description hr {
                border: none !important;
                border-top: 1px solid #e5e7eb !important;
                margin: 24px 0 !important;
              }
              .product-description img {
                max-width: 100% !important;
                height: auto !important;
                border-radius: 8px !important;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
                margin: 16px 0 !important;
              }
            `,
            }}
          />

          {/* 리뷰 섹션 */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">상품 리뷰 ({reviews.length})</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">{renderStars(product.rating)}</div>
                <span className="font-semibold">{product.rating}</span>
              </div>
            </div>

            {canWriteReview && (
              <div className="border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">리뷰 작성</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">평점:</span>
                    <StarRatingInput
                      value={newReview.rating}
                      onChange={(v) => setNewReview((prev) => ({ ...prev, rating: v }))}
                      size="lg"
                    />
                    <span className="text-sm text-gray-600 ml-2">
                      {newReview.rating.toFixed(1)}점
                    </span>
                  </div>

                  <textarea
                    value={newReview.content}
                    onChange={(e) => setNewReview((prev) => ({ ...prev, content: e.target.value }))}
                    placeholder="상품에 대한 솔직한 리뷰를 작성해주세요."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d4739] resize-none"
                    rows={4}
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={handleSubmitReview}
                      disabled={!newReview.content.trim()}
                      className="bg-[#2d4739] hover:bg-[#1a2e20] disabled:bg-gray-300 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                    >
                      리뷰 작성
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  {editingReview === review.id ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">평점:</span>
                        <div className="flex gap-1 select-none">
                          {Array.from({ length: 5 }).map((_, idx) => {
                            const i = idx + 1;
                            const fillPct = Math.max(
                              0,
                              Math.min(1, editReviewData.rating - (i - 1))
                            );
                            return (
                              <span key={i} className="relative inline-block w-5 h-5">
                                <Star className="w-5 h-5 text-gray-300" />
                                <span
                                  className="absolute top-0 left-0 overflow-hidden pointer-events-none"
                                  style={{ width: `${fillPct * 100}%` }}
                                >
                                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                </span>
                                <button
                                  type="button"
                                  aria-label={`${i - 0.5}점`}
                                  onClick={() =>
                                    setEditReviewData((prev) => ({ ...prev, rating: i - 0.5 }))
                                  }
                                  className="absolute left-0 top-0 h-full w-1/2"
                                />
                                <button
                                  type="button"
                                  aria-label={`${i}점`}
                                  onClick={() =>
                                    setEditReviewData((prev) => ({ ...prev, rating: i }))
                                  }
                                  className="absolute right-0 top-0 h-full w-1/2"
                                />
                              </span>
                            );
                          })}
                        </div>
                        <span className="text-sm text-gray-600 ml-2">
                          {editReviewData.rating.toFixed(1)}점
                        </span>
                      </div>

                      <textarea
                        value={editReviewData.content}
                        onChange={(e) =>
                          setEditReviewData((prev) => ({ ...prev, content: e.target.value }))
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d4739] resize-none"
                        rows={3}
                        placeholder="리뷰 내용을 입력하세요."
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateReview}
                          className="bg-[#2d4739] hover:bg-[#1a2e20] text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          수정 완료
                        </button>
                        <button
                          onClick={() => setEditingReview(null)}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">{review.userName}</span>
                          <div className="flex items-center gap-1">
                            {renderStars(review.rating)}
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDate(review.updatedAt || review.createdAt)}
                            {review.isEdited && <span className="ml-1">(수정됨)</span>}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {review.isOwner && (
                            <>
                              <button
                                onClick={() => handleEditReview(review.id)}
                                className="text-gray-600 hover:text-[#2d4739] text-sm"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDeleteReview(review.id)}
                                className="text-gray-600 hover:text-red-600 text-sm"
                              >
                                삭제
                              </button>
                            </>
                          )}
                          {product.isOwner && !review.isOwner && (
                            <button className="text-gray-600 hover:text-red-600">
                              <Flag className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3 whitespace-pre-wrap">{review.content}</p>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleLikeReview(review.id)}
                          className={`flex items-center gap-1 text-sm ${
                            review.isLiked ? 'text-[#2d4739]' : 'text-gray-600 hover:text-[#2d4739]'
                          }`}
                        >
                          <ThumbsUp className={`w-4 h-4 ${review.isLiked ? 'fill-current' : ''}`} />
                          좋아요 {review.likes > 0 && `(${review.likes})`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {reviews.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-600">아직 작성된 리뷰가 없습니다.</p>
                  {canWriteReview && (
                    <p className="text-gray-500 text-sm mt-2">첫 번째 리뷰를 작성해보세요!</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 신고 모달 */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">상품 신고</h3>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상품명</label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded border">{product.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">신고 사유</label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="신고 사유를 입력해주세요"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleReport}
                  disabled={!reportReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  신고하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainProductsDetail;
