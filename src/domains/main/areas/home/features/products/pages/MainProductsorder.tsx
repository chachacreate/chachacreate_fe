// src/domains/main/areas/home/features/products/pages/MainProductsorder.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, MapPin, Package, Loader2 } from 'lucide-react';

import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import MypageSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar';

import { get, legacyPost } from '@src/libs/request';
import { getCurrentUser, type UserInfo } from '@src/shared/util/jwtUtils';
import { truncateText } from '@src/shared/util/truncateUtil';

/* ============ 타입 ============ */
type StoredOrderItem = {
  productId: number;
  productName: string;
  productDetail?: string;
  productCnt: number;
  price: number;
  pimgUrl: string;
  storeName?: string;
  storeUrl?: string;
  cartId?: number | null;
};

/* ============ 유틸 ============ */
const loadScriptOnce = (src: string, id: string) =>
  new Promise<void>((resolve, reject) => {
    if (document.getElementById(id)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.id = id;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });

/* ============ 컴포넌트 ============ */
const MainProductsorder: React.FC = () => {
  const navigate = useNavigate();

  // 로그인 사용자
  const user = useMemo<UserInfo | null>(() => getCurrentUser(), []);

  // 배송지 상태
  const [useDefaultAddr, setUseDefaultAddr] = useState(false);
  const [defaultAddrId, setDefaultAddrId] = useState<number | null>(null);

  const [postNum, setPostNum] = useState('');
  const [addressRoad, setAddressRoad] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [addressExtra, setAddressExtra] = useState('');

  // 수령인/연락처 (초기값: 로그인 사용자 이름/전화)
  const [receiverName, setReceiverName] = useState(user?.name ?? '');
  const [receiverPhone, setReceiverPhone] = useState(user?.phone ?? '');

  // 주문 상품
  const [items, setItems] = useState<StoredOrderItem[]>([]);
  const [isFromCart, setIsFromCart] = useState(false);

  // 로딩/오류
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 합계
  const deliveryFee = 0;
  const itemsTotal = useMemo(
    () => items.reduce((sum, it) => sum + it.price * it.productCnt, 0),
    [items]
  );
  const finalTotal = useMemo(() => itemsTotal + deliveryFee, [itemsTotal]);

  // 결제 타이틀 (첫 상품명 + 외 N개) - 레거시와 동일한 로직
  const productTitle = useMemo(() => {
    if (items.length === 0) return '';
    const first = items[0].productName;
    return items.length > 1 ? `${first} 외 ${items.length - 1}개의 상품` : first;
  }, [items]);

  // 우편번호 버튼 비활성화 기준
  const postcodeDisabled = useDefaultAddr;

  // 초기화: 외부 스크립트 로드 + 세션 상품 로드
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          loadScriptOnce('https://cdn.iamport.kr/js/iamport.payment-1.2.0.js', 'iamport-script'),
          loadScriptOnce(
            '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js',
            'daum-postcode-script'
          ),
        ]);

        const raw = sessionStorage.getItem('orderItems');
        if (!raw) {
          alert('선택된 상품이 없습니다. 장바구니에서 다시 선택해주세요.');
          navigate('/main/mypage/cart');
          return;
        }
        const parsed: StoredOrderItem[] = JSON.parse(raw);
        setItems(parsed);
        setIsFromCart(parsed.some((p) => p.cartId !== undefined && p.cartId !== null));
      } catch (e: any) {
        console.error(e);
        setError('초기화 중 문제가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const [loadingDefaultAddr, setLoadingDefaultAddr] = useState(false);

  // 기본배송지 fetch
  const fetchDefaultAddress = useCallback(async () => {
    if (!user?.memberId) return;

    try {
      setLoadingDefaultAddr(true);
      const response = await get<any>(`/info/memberAddress/${user.memberId}`);
      if (response?.status === 200 && response?.data) {
        const addr = response.data;
        setPostNum(addr.postNum ?? '');
        setAddressRoad(addr.addressRoad ?? '');
        setAddressDetail(addr.addressDetail ?? '');
        setAddressExtra(addr.addressExtra ?? '');
        // console.log('DEBUG fetched addr:', addr);
      } else {
        setDefaultAddrId(null);
        alert('기본 배송지를 불러오지 못했습니다.');
      }
    } catch (error) {
      setDefaultAddrId(null);
      console.error('API 요청 실패', error);
    } finally {
      setLoadingDefaultAddr(false);
    }
  }, [user?.memberId]);

  // 체크박스 토글
  const onToggleDefaultAddr = (checked: boolean) => {
    setUseDefaultAddr(checked);
    if (checked) {
      fetchDefaultAddress(); // fetch가 끝날 때까지 로딩 상태로 결제 막기
    } else {
      setPostNum('');
      setAddressRoad('');
      setAddressDetail('');
      setAddressExtra('');
    }
  };

  // 다음 주소검색
  const openDaumPostcode = () => {
    const w = window as any;
    if (!w?.daum?.Postcode) {
      alert('주소 검색 스크립트를 불러오지 못했습니다.');
      return;
    }
    new w.daum.Postcode({
      oncomplete: function (data: any) {
        let addr = '';
        let extraAddr = '';

        if (data.userSelectedType === 'R') {
          addr = data.roadAddress;
          if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) extraAddr += data.bname;
          if (data.buildingName !== '' && data.apartment === 'Y') {
            extraAddr += extraAddr !== '' ? ', ' + data.buildingName : data.buildingName;
          }
          if (extraAddr !== '') extraAddr = ' (' + extraAddr + ')';
          setAddressExtra(extraAddr);
        } else {
          addr = data.jibunAddress;
          setAddressExtra('');
        }

        setPostNum(data.zonecode);
        setAddressRoad(addr);
        const el = document.getElementById('detailAddressInput') as HTMLInputElement | null;
        el?.focus();
      },
    }).open();
  };

  // 결제하기 - 레거시 코드와 동일한 구조로 수정
  const onPay = async () => {
    if (!user?.memberId) {
      alert('로그인 정보가 없습니다.');
      return;
    }

    const w = window as any;
    if (!w.IMP) {
      alert('결제 모듈(아임포트)을 불러오지 못했습니다.');
      return;
    }

    setPaying(true);
    try {
      const IMP = w.IMP;
      IMP.init('imp85735807');

      const amount = finalTotal;
      const merchant_uid = 'merchant_' + new Date().getTime();

      // 결제 처리
      await new Promise<void>((resolve, reject) => {
        IMP.request_pay(
          {
            pg: 'html5_inicis',
            pay_method: 'card',
            merchant_uid,
            name: productTitle,
            amount: parseInt(String(amount), 10),
            buyer_email: user?.email ?? '',
            buyer_name: user?.name ?? '',
          },
          (rsp: any) => {
            if (rsp?.success) resolve();
            else reject(new Error(rsp?.error_msg || '결제 실패'));
          }
        );
      });

      // DTO 조립 - 레거시와 정확히 동일한 구조
      const bootAddr = useDefaultAddr
        ? null
        : {
            postNum: postNum || null,
            addressRoad: addressRoad || null,
            addressDetail: addressDetail || null,
            addressExtra: addressExtra || null,
          };

      const orderInfo = {
        memberId: user.memberId,
        orderDate: new Date().toISOString().slice(0, 10),
        orderName: receiverName,
        orderPhone: receiverPhone,
        addressId: useDefaultAddr ? defaultAddrId : null,
        cardId: null,
        orderStatus: 'ORDER_OK',
      };

      // detailList - orderId는 null로 설정 (서버에서 생성)
      const detailList = items.map((it) => ({
        orderId: null,
        productId: it.productId,
        orderCnt: it.productCnt,
        orderPrice: it.price * it.productCnt,
      }));

      const orderRequestDTO = {
        orderInfo,
        detailList,
        bootAddr,
        newAddr: !useDefaultAddr, // 기본주소 미사용이면 true
      };

      // console.log('DEBUG sending DTO:', orderRequestDTO);

      // 주문 생성 (레거시)
      const res = await legacyPost<any>('/main/order', orderRequestDTO);

      if (res?.status === 201) {
        const orderId = parseInt(String(res.data), 10);

        // 장바구니에서 온 경우 → 항목 삭제 (선택적)
        if (isFromCart) {
          try {
            const cartIds = items.map((p) => p.cartId).filter((id): id is number => !!id);
            await Promise.all(
              cartIds.map((cid) =>
                fetch(`/main/mypage/cart/delete/${cid}`, { method: 'DELETE' }).catch(() => null)
              )
            );
          } catch (e) {
            console.warn('장바구니 삭제 실패:', e);
          }
        }

        // 성공 시
        alert(`주문이 완료되었습니다. 주문번호 : ${orderId}`);
        sessionStorage.removeItem('orderItems');
        navigate(`/main/order/result/success?orderId=${orderId}&amount=${String(finalTotal)}`, {
          state: { orderId, amount: finalTotal },
        });
      } else {
        // 실패 시
        const msg = res?.message ?? '주문 생성 실패';
        navigate(`/main/order/result/fail?message=${encodeURIComponent(msg)}`, {
          state: { message: msg },
        });
      }
    } catch (e: any) {
      console.error('결제/주문 오류:', e);
      const msg = e?.message ?? '결제 또는 주문 처리 실패';
      alert(`결제/주문에 실패했습니다. ${msg}`);

      // 예외 발생 시도 fail로 이동
      navigate(`/main/order/result/fail?message=${encodeURIComponent(msg)}`, {
        state: { message: msg },
      });
    } finally {
      setPaying(false);
    }
  };

  // 우측 결제 요약 sticky
  const Summary = (
    <aside className="sticky top-24">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">결제 예상 금액</h3>

        <div className="space-y-3 mb-4">
          {items.map((it) => {
            const itemTotal = it.price * it.productCnt;
            return (
              <div
                key={`${it.productId}-${it.productCnt}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate">
                  {it.productName} × {it.productCnt}
                </span>
                <span>{itemTotal.toLocaleString()} 원</span>
              </div>
            );
          })}
          <div className="flex items-center justify-between text-sm">
            <span>배송비</span>
            <span>{deliveryFee.toLocaleString()} 원</span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
          <span className="text-gray-600">총 결제 금액</span>
          <span className="text-lg font-bold text-gray-900">{finalTotal.toLocaleString()} 원</span>
        </div>

        <button
          onClick={onPay}
          disabled={paying || items.length === 0}
          className={`mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold transition
            ${paying ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#2d4739] hover:bg-[#243c30]'}`}
        >
          {paying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4" />
          )}
          {paying ? '결제 처리중...' : '결제하기'}
        </button>
      </div>
    </aside>
  );

  return (
    <div
      className="min-h-screen font-jua"
      style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)' }}
    >
      <Header />
      <Mainnavbar />

      {/* 모바일 상단바 */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => (history.length > 1 ? history.back() : navigate('/main'))}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">주문/결제</h1>
            <div className="ml-auto" />
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-0 mt-6">
        <div className="hidden lg:grid lg:grid-cols-[280px_1fr_420px] gap-8">
          {/* 좌측 사이드바 */}
          <div>
            <MypageSidenavbar />
          </div>

          {/* 가운데: 배송지 + 주문상품 */}
          <div className="space-y-8">
            {/* 배송지 */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-gray-800" />
                <h2 className="text-xl font-bold text-gray-900">배송지</h2>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">이름</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="수령인 이름"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">연락처</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      placeholder="연락처"
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-600 mb-1">우편번호</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        value={postNum}
                        onChange={(e) => setPostNum(e.target.value)}
                        placeholder="우편번호"
                        readOnly={useDefaultAddr}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={openDaumPostcode}
                      disabled={postcodeDisabled}
                      className={`mt-6 md:mt-0 h-10 px-3 rounded-lg border text-sm
                        ${
                          postcodeDisabled
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
                        }`}
                    >
                      우편번호 찾기
                    </button>

                    <label className="flex items-center gap-2 mt-6 md:mt-0 ml-auto">
                      <input
                        type="checkbox"
                        checked={useDefaultAddr}
                        onChange={(e) => onToggleDefaultAddr(e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">기본배송지 사용</span>
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">주소</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      value={addressRoad}
                      onChange={(e) => setAddressRoad(e.target.value)}
                      placeholder="주소"
                      readOnly={useDefaultAddr}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">상세주소</label>
                    <input
                      id="detailAddressInput"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      placeholder="상세주소"
                      readOnly={useDefaultAddr}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">참고항목</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      value={addressExtra}
                      onChange={(e) => setAddressExtra(e.target.value)}
                      placeholder="참고항목"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 주문 상품 */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-gray-800" />
                <h2 className="text-xl font-bold text-gray-900">주문 상품</h2>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
                {loading ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    불러오는 중...
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-sm text-gray-600">선택된 상품이 없습니다.</div>
                ) : (
                  <div className="space-y-4">
                    {items.map((it) => (
                      <div
                        key={`${it.productId}-${it.productCnt}`}
                        className="flex items-center gap-4 border-t first:border-t-0 pt-4 first:pt-0"
                      >
                        <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                          <img
                            src={it.pimgUrl}
                            alt={it.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-500">{it.storeName}</div>
                          <div className="text-base font-semibold text-gray-900">
                            {it.productName}
                          </div>
                          {it.productDetail && (
                            <div className="text-sm text-gray-600 line-clamp-2">
                              {truncateText(it.productDetail, 100)}
                            </div>
                          )}
                          <div className="text-sm text-gray-700 mt-1">수량: {it.productCnt}개</div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-semibold text-gray-900">
                            {it.price.toLocaleString()} 원
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* 우측: 결제 요약 (sticky) */}
          <div>{Summary}</div>
        </div>

        {/* 모바일: 사이드바 없이 1단 + 하단 고정 결제바 */}
        <div className="lg:hidden">
          {/* 배송지 & 상품 */}
          <div className="space-y-8 pb-20">
            {/* 배송지 카드 (모바일) */}
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-gray-800" />
                <h2 className="text-xl font-bold text-gray-900">배송지</h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">이름</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="수령인 이름"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">연락처</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="연락처"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">우편번호</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      value={postNum}
                      onChange={(e) => setPostNum(e.target.value)}
                      placeholder="우편번호"
                      readOnly={useDefaultAddr}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={openDaumPostcode}
                    disabled={postcodeDisabled}
                    className={`mt-6 h-10 px-3 rounded-lg border text-sm
                      ${
                        postcodeDisabled
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
                      }`}
                  >
                    우편번호 찾기
                  </button>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useDefaultAddr}
                    onChange={(e) => onToggleDefaultAddr(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">기본배송지 사용</span>
                </label>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">주소</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={addressRoad}
                    onChange={(e) => setAddressRoad(e.target.value)}
                    placeholder="주소"
                    readOnly={useDefaultAddr}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">상세주소</label>
                  <input
                    id="detailAddressInput"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="상세주소"
                    readOnly={useDefaultAddr}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">참고항목</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={addressExtra}
                    onChange={(e) => setAddressExtra(e.target.value)}
                    placeholder="참고항목"
                    readOnly
                  />
                </div>
              </div>
            </section>

            {/* 주문상품 (모바일) */}
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-gray-800" />
                <h2 className="text-xl font-bold text-gray-900">주문 상품</h2>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  불러오는 중...
                </div>
              ) : items.length === 0 ? (
                <div className="text-sm text-gray-600">선택된 상품이 없습니다.</div>
              ) : (
                <div className="space-y-4">
                  {items.map((it) => (
                    <div
                      key={`${it.productId}-${it.productCnt}`}
                      className="flex items-center gap-4 border-t first:border-t-0 pt-4 first:pt-0"
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                        <img
                          src={it.pimgUrl}
                          alt={it.productName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-500">{it.storeName}</div>
                        <div className="text-base font-semibold text-gray-900">
                          {it.productName}
                        </div>
                        {it.productDetail && (
                          <div className="text-sm text-gray-600 line-clamp-2">
                            {truncateText(it.productDetail, 100)}
                          </div>
                        )}
                        <div className="text-sm text-gray-700 mt-1">수량: {it.productCnt}개</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-semibold text-gray-900">
                          {it.price.toLocaleString()} 원
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 모바일 하단 고정 결제바 */}
            <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">총 결제 금액</div>
                  <div className="text-lg font-bold text-gray-900">
                    {finalTotal.toLocaleString()} 원
                  </div>
                </div>
                <button
                  onClick={onPay}
                  disabled={paying || items.length === 0}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-semibold transition
                    ${paying ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#2d4739] hover:bg-[#243c30]'}`}
                >
                  {paying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  {paying ? '결제 처리중...' : '결제하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainProductsorder;
