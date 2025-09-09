import React, { useState, useEffect } from 'react';
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import { 
  Star, 
  ShoppingCart, 
  CreditCard, 
  Flag, 
  Edit, 
  Minus, 
  Plus, 
  ThumbsUp,
  X,
  MoreHorizontal
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  storeName: string;
  storeId: string;
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
  const [loading, setLoading] = useState(true);

  // 더미 데이터 생성
  useEffect(() => {
    const generateDummyData = () => {
      const dummyProduct: Product = {
        id: 'product-1',
        name: '프리미엄 무선 블루투스 이어폰 - 노이즈 캔슬링 기능',
        price: 129000,
        images: [
          'https://picsum.photos/600/600?random=1',
          'https://picsum.photos/600/600?random=2',
          'https://picsum.photos/600/600?random=3'
        ],
        storeName: '테크스토어',
        storeId: 'store-1',
        categories: ['전자제품', '오디오'],
        description: `
          <h3>상품 소개</h3>
          <p>최신 노이즈 캔슬링 기술을 적용한 프리미엄 무선 이어폰입니다.</p>
          
          <h4>주요 특징</h4>
          <ul>
            <li>액티브 노이즈 캔슬링 (ANC) 기술</li>
            <li>최대 30시간 재생 시간</li>
            <li>고품질 사운드</li>
            <li>편안한 착용감</li>
            <li>IPX5 방수 등급</li>
          </ul>
          
          <h4>제품 사양</h4>
          <ul>
            <li>드라이버: 40mm 다이나믹 드라이버</li>
            <li>주파수 응답: 20Hz - 20kHz</li>
            <li>블루투스: 5.2</li>
            <li>충전 시간: 2시간</li>
            <li>무게: 250g</li>
          </ul>
        `,
        rating: 4.5,
        reviewCount: 128,
        isOwner: false
      };

      const dummyReviews: Review[] = [
        {
          id: 'review-1',
          userName: '김철수',
          createdAt: '2024-03-15T10:30:00Z',
          rating: 5,
          content: '음질이 정말 좋습니다! 노이즈 캔슬링 기능도 훌륭해요. 강력 추천합니다.',
          likes: 12,
          isOwner: true,
          isLiked: false,
          isEdited: false
        },
        {
          id: 'review-2',
          userName: '이영희',
          createdAt: '2024-03-14T15:20:00Z',
          updatedAt: '2024-03-14T16:00:00Z',
          rating: 4,
          content: '전반적으로 만족스럽습니다. 배터리 지속시간이 길어서 좋아요. (수정: 며칠 사용해보니 더욱 만족스럽네요!)',
          likes: 8,
          isOwner: false,
          isLiked: true,
          isEdited: true
        },
        {
          id: 'review-3',
          userName: '박민수',
          createdAt: '2024-03-13T09:15:00Z',
          rating: 4.5,
          content: '가성비가 좋은 제품입니다. 디자인도 깔끔하고 착용감이 편해요.',
          likes: 5,
          isOwner: false,
          isLiked: false,
          isEdited: false
        }
      ];

      setProduct(dummyProduct);
      setReviews(dummyReviews);
      setCanWriteReview(true); // 구매 이력이 있다고 가정
      setLoading(false);
    };

    generateDummyData();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const renderStars = (rating: number, size: 'small' | 'large' = 'small') => {
    const stars = [];
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
    window.location.href = `/stores/${product?.storeId}`;
  };

  const handleReport = () => {
    if (reportReason.trim()) {
      // 신고 처리 로직
      alert('신고가 접수되었습니다.');
      setIsReportModalOpen(false);
      setReportReason('');
    }
  };

  const handleAddToCart = () => {
    alert(`장바구니에 ${quantity}개 추가되었습니다.`);
  };

  const handleBuyNow = () => {
    alert('결제 페이지로 이동합니다.');
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
        isEdited: false
      };
      setReviews(prev => [review, ...prev]);
      setNewReview({ rating: 5, content: '' });
    }
  };

  const handleEditReview = (reviewId: string) => {
    const review = reviews.find(r => r.id === reviewId);
    if (review) {
      setEditReviewData({ rating: review.rating, content: review.content });
      setEditingReview(reviewId);
    }
  };

  const handleUpdateReview = () => {
    if (editingReview && editReviewData.content.trim()) {
      setReviews(prev => prev.map(review => 
        review.id === editingReview 
          ? { 
              ...review, 
              rating: editReviewData.rating, 
              content: editReviewData.content,
              updatedAt: new Date().toISOString(),
              isEdited: true
            }
          : review
      ));
      setEditingReview(null);
      setEditReviewData({ rating: 5, content: '' });
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    if (confirm('리뷰를 삭제하시겠습니까?')) {
      setReviews(prev => prev.filter(review => review.id !== reviewId));
    }
  };

  const handleLikeReview = (reviewId: string) => {
    setReviews(prev => prev.map(review => 
      review.id === reviewId 
        ? { 
            ...review, 
            likes: review.isLiked ? review.likes - 1 : review.likes + 1,
            isLiked: !review.isLiked
          }
        : review
    ));
  };

// ⭐ 0.5 단위 별점 입력 컴포넌트
const StarRatingInput = ({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeClass =
    size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="flex gap-1 select-none">
      {Array.from({ length: 5 }).map((_, idx) => {
        const i = idx + 1;
        // 현재 별(i)에 채워질 비율(0~1)
        const fillPct = Math.max(0, Math.min(1, value - (i - 1)));

        return (
          <span key={i} className={`relative inline-block ${sizeClass}`}>
            {/* 회색 바탕 별 */}
            <Star className={`${sizeClass} text-gray-300`} />

            {/* 채워진 부분(오버레이) */}
            <span
                className="absolute top-0 left-0 overflow-hidden pointer-events-none"
                style={{ width: `${fillPct * 100}%` }}
            >
                <Star className={`${sizeClass} text-yellow-400 fill-yellow-400`} />
            </span>

            {/* 클릭 영역: 왼쪽(0.5), 오른쪽(1.0) */}
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

  

  if (loading || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4739]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
        <Header />
        <Mainnavbar />
      {/* 컨테이너 */}
      <div className="max-w-screen-2xl mx-auto px-4 ">
        <div className="max-w-[1440px] mx-auto py-0 sm:py-8">
          
          {/* 상품 정보 섹션 */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-8 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* 이미지 섹션 */}
              <div className="space-y-4">
                {/* 메인 이미지 - 크기 줄임 */}
                <div className="w-full max-w-[400px] mx-auto aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={product.images[selectedImageIndex]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* 썸네일 이미지들 */}
                {product.images.length > 1 && (
                  <div className="flex gap-2 justify-center">
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                          selectedImageIndex === index 
                            ? 'border-[#2d4739]' 
                            : 'border-gray-200'
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
                {/* 스토어 정보 */}
                <div>
                  <button
                    onClick={handleStoreClick}
                    className="text-[#2d4739] hover:text-[#1a2e20] font-medium"
                  >
                    {product.storeName}
                  </button>
                </div>

                {/* 상품명 & 신고/수정 버튼 */}
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

                {/* 카테고리 */}
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

                {/* 평점 */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {renderStars(product.rating, 'large')}
                  </div>
                  <span className="text-xl font-semibold">{product.rating}</span>
                  <span className="text-gray-600">({product.reviewCount}개 리뷰)</span>
                </div>

                {/* 가격 */}
                <div className="py-4 border-t border-b border-gray-200">
                  <p className="text-3xl font-bold text-[#2d4739]">
                    {formatPrice(product.price)}원
                  </p>
                </div>

                {/* 수량 선택 */}
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

                  {/* 총 가격 */}
                  <div className="text-lg font-semibold text-gray-900">
                    총 가격: <span className="text-[#2d4739]">{formatPrice(product.price * quantity)}원</span>
                  </div>
                </div>

                {/* 버튼들 */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAddToCart}
                    className="flex items-center justify-center gap-2 flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    장바구니
                  </button>
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
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">상품 상세정보</h2>
            <div 
              className="prose prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          </div>

          {/* 리뷰 섹션 */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                상품 리뷰 ({reviews.length})
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {renderStars(product.rating)}
                </div>
                <span className="font-semibold">{product.rating}</span>
              </div>
            </div>

            {/* 리뷰 작성 폼 */}
            {canWriteReview && (
              <div className="border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">리뷰 작성</h3>
                <div className="space-y-4">
                  {/* 별점 선택 - 0.5 단위 */}
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

                  {/* 리뷰 내용 */}
                  <textarea
                    value={newReview.content}
                    onChange={(e) => setNewReview(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="상품에 대한 솔직한 리뷰를 작성해주세요."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d4739] resize-none"
                    rows={4}
                  />

                  {/* 작성 버튼 */}
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

            {/* 리뷰 목록 */}
            <div className="space-y-6">
              {reviews.map(review => (
                <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  {editingReview === review.id ? (
                    /* 리뷰 수정 폼 */
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">평점:</span>
                        <div className="flex gap-1 select-none">
                            {Array.from({ length: 5 }).map((_, idx) => {
                            const i = idx + 1;
                            const fillPct = Math.max(0, Math.min(1, editReviewData.rating - (i - 1)));
                            return (
                                <span key={i} className="relative inline-block w-5 h-5">
                                {/* 회색 바탕 별 */}
                                <Star className="w-5 h-5 text-gray-300" />
                                {/* 채워진 오버레이 (0~100%) */}
                                <span
                                    className="absolute top-0 left-0 overflow-hidden pointer-events-none"
                                    style={{ width: `${fillPct * 100}%` }}
                                >
                                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                </span>
                                {/* 클릭 영역: 왼쪽(0.5), 오른쪽(1.0) */}
                                <button
                                    type="button"
                                    aria-label={`${i - 0.5}점`}
                                    onClick={() =>
                                    setEditReviewData(prev => ({ ...prev, rating: i - 0.5 }))
                                    }
                                    className="absolute left-0 top-0 h-full w-1/2"
                                />
                                <button
                                    type="button"
                                    aria-label={`${i}점`}
                                    onClick={() =>
                                    setEditReviewData(prev => ({ ...prev, rating: i }))
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
                        {/* 기존 내용이 그대로 보이는 입력창 */}
    <textarea
      value={editReviewData.content}
      onChange={(e) =>
        setEditReviewData(prev => ({ ...prev, content: e.target.value }))
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
                    /* 일반 리뷰 표시 */
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
                        
                        {/* 리뷰 액션 버튼들 */}
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
                            review.isLiked 
                              ? 'text-[#2d4739]' 
                              : 'text-gray-600 hover:text-[#2d4739]'
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상품명
                </label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded border">
                  {product.name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  신고 사유
                </label>
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