// src/domains/main/areas/mypage/pages/MypageApiSmokeTest.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

// 컴포넌트 imports (첫 번째 코드에서 사용된 컴포넌트들)
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import MypageSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar";


// 요청 유틸 (그대로 사용)
import { get, patch, legacyGet, legacyPost } from "@src/libs/request";
import { isLoggedIn } from "@src/shared/util/jwtUtils";

/* ======================== Types ======================== */
type Params = { storeUrl?: string };

type LegacyEnvelope<T> = { status: number; message?: string; data: T | null };
type ApiResponse<T> = { status: number; message: string; data: T | null };

type Member = {
  memberId: number;
  memberName: string;
  memberPhone: string;
  memberEmail: string;
};

type Address = {
  postNum: string;
  addressRoad: string;
  addressDetail: string;
  addressExtra?: string;
};

type SellerLegacy = {
  account?: string;
  accountBank?: string; // 은행명
  accountOwner?: string;
  profileInfo?: string;
  profileImageName?: string;
};

type BankVerifyResponse = {
  bankHolderInfo?: string;
};

/* ======================== Helpers ======================== */
function asApi<T>(env: LegacyEnvelope<T>): ApiResponse<T> {
  return { status: env.status, message: env.message ?? "", data: env.data as T };
}

const BANKS = [
  { code: "004", name: "국민은행" },
  { code: "020", name: "우리은행" },
  { code: "088", name: "신한은행" },
  { code: "003", name: "기업은행" },
  { code: "023", name: "SC제일은행" },
  { code: "011", name: "농협은행" },
  { code: "005", name: "외환은행" },
  { code: "090", name: "카카오뱅크" },
  { code: "032", name: "부산은행" },
  { code: "071", name: "우체국" },
  { code: "031", name: "대구은행" },
  { code: "037", name: "전북은행" },
  { code: "035", name: "제주은행" },
  { code: "007", name: "수협은행" },
  { code: "027", name: "씨티은행" },
  { code: "039", name: "경남은행" },
];
const bankNameByCode = (code: string) => BANKS.find(b => b.code === code)?.name ?? "";
const bankCodeByName = (name: string) => BANKS.find(b => b.name === name)?.code ?? "";

/** 특수문자 포함 비밀번호 검증 (간단 버전) */
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isPasswordValid = (pwd: string) => {
  const special = new RegExp("[" + escapeRegExp(`!"#$%&'()*+,-./:;<=>?@[\\]^_\`{|}~`) + "]");
  return pwd.length >= 8 && /[a-zA-Z]/.test(pwd) && /[0-9]/.test(pwd) && special.test(pwd);
};

/* ======================== Component ======================== */
export default function MypageApiSmokeTest() {
  const { storeUrl } = useParams<Params>();
  const legacyStore = useMemo(() => storeUrl ?? "default", [storeUrl]);

  // ---- 상태 ----
  const [member, setMember] = useState<Member | null>(null);

  // 기본정보(표시용)
  const [nameValue, setNameValue] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [emailValue, setEmailValue] = useState("");

  // 주소
  const [postNum, setPostNum] = useState("");
  const [addressRoad, setAddressRoad] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [addressExtra, setAddressExtra] = useState("");

  // 비밀번호 (입력만; 현비번은 절대 조회/노출 안 함)
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdNewOk, setPwdNewOk] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showNewPwdOk, setShowNewPwdOk] = useState(false);

  // 판매자 계좌 정보
  const [bankCode, setBankCode] = useState("");
  const [account, setAccount] = useState("");
  const [accountOwner, setAccountOwner] = useState("");
  const [isAccountEditing, setIsAccountEditing] = useState(false);
  const [isAccountVerified, setIsAccountVerified] = useState(false);
  const [savedAccountNum, setSavedAccountNum] = useState("");
  const [savedBankCode, setSavedBankCode] = useState("");
  const [originalSellerData, setOriginalSellerData] = useState<SellerLegacy>({});

  // 이력 정보
  const [careerText, setCareerText] = useState("");
  const [profileImagePreview, setProfileImagePreview] = useState("");

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 멤버별 주소 조회: Boot API 사용 (레거시 코드 참고) */
  const fetchAddressByMemberId = useCallback(
    async (memberId: number) => {
      try {
        const response = await get<Address>(`/api/info/memberAddress/${memberId}`);
        if (response.status === 200 && response.data) return response.data;
        return null;
      } catch (error) {
        console.error("주소 조회 실패:", error);
        return null;
      }
    },
    []
  );

  /** 계좌 인증 API 호출 (레거시: /legacy/common/bank) */
  const verifyBankAccount = useCallback(async (bankCode: string, accountNum: string) => {
    const clean = accountNum.replace(/[^0-9]/g, "");
    const env = await legacyGet<LegacyEnvelope<BankVerifyResponse>>(
      `/common/bank?bank_code=${encodeURIComponent(bankCode)}&bank_num=${encodeURIComponent(clean)}`
    );
    return asApi(env); // ApiResponse<BankVerifyResponse>
  }, []);

  /** 전체 불러오기: 기본정보(레거시) → 주소(Boot) → 판매자(레거시) */
  const loadAll = useCallback(async () => {
    if (!isLoggedIn()) {
      alert("로그인이 필요합니다.");
      return;
    }
    setLoading(true);
    try {
      // 1) Member (LEGACY)
      const memberEnv = await legacyGet<LegacyEnvelope<Member>>(`/${legacyStore}/mypage`);
      const memberRes = asApi(memberEnv);
      if (memberRes.status !== 200 || !memberRes.data) {
        throw new Error(memberRes.message || "회원 정보 조회 실패");
      }
      const m = memberRes.data;
      setMember(m);
      setNameValue(m.memberName ?? "");
      setPhoneValue(m.memberPhone ?? "");
      setEmailValue(m.memberEmail ?? "");

      // 2) Address (Boot)
      const a = await fetchAddressByMemberId(m.memberId);
      if (a) {
        setPostNum(a.postNum ?? "");
        setAddressRoad(a.addressRoad ?? "");
        setAddressDetail(a.addressDetail ?? "");
        setAddressExtra(a.addressExtra ?? "");
      } else {
        setPostNum("");
        setAddressRoad("");
        setAddressDetail("");
        setAddressExtra("");
      }

      // 3) Seller (LEGACY)
      try {
        const env = await legacyGet<LegacyEnvelope<SellerLegacy>>(`/main/sell/info`);
        const res = asApi(env);
        if (res.status === 200 && res.data) {
          const s = res.data;
          setAccount(s.account ?? "");
          setBankCode(bankCodeByName(s.accountBank ?? ""));
          setAccountOwner(s.accountOwner ?? m.memberName ?? "");
          setCareerText(s.profileInfo ?? "");
          if (s.profileImageName) {
            setProfileImagePreview(`/resources/profileImages/${s.profileImageName}`);
          } else {
            setProfileImagePreview("");
          }
          // 저장 기준값
          setSavedAccountNum(s.account ?? "");
          setSavedBankCode(bankCodeByName(s.accountBank ?? ""));
          setOriginalSellerData(s);
          setIsAccountVerified(true);
          setIsAccountEditing(false);
        } else {
          // 신규 등록 모드
          setAccount("");
          setBankCode("");
          setAccountOwner(m.memberName ?? "");
          setCareerText("");
          setProfileImagePreview("");
          setSavedAccountNum("");
          setSavedBankCode("");
          setOriginalSellerData({});
          setIsAccountVerified(false);
          setIsAccountEditing(true);
        }
      } catch {
        // 신규 등록 모드
        setAccount("");
        setBankCode("");
        setAccountOwner(m.memberName ?? "");
        setCareerText("");
        setProfileImagePreview("");
        setSavedAccountNum("");
        setSavedBankCode("");
        setOriginalSellerData({});
        setIsAccountVerified(false);
        setIsAccountEditing(true);
      }
    } catch (e: any) {
      alert(e?.message || "조회 중 오류");
    } finally {
      setLoading(false);
    }
  }, [legacyStore, fetchAddressByMemberId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* ======================== Actions ======================== */

  // 주소 저장: Boot PATCH (/api/mypage/changeaddr)
  const saveAddress = async () => {
    if (!member) return alert("member 없음");
    const addressData = { postNum, addressRoad, addressDetail, addressExtra };
    try {
      const result = await patch<any>(`/mypage/changeaddr`, addressData);
      if (result.status === 200) {
        alert("주소 저장 성공");
      } else {
        alert("주소 저장 실패");
      }
    } catch (err: any) {
      console.error("[saveAddress] error:", err);
      alert("api 호출 실패");
    }
  };

  // 📌 우편번호 팝업 열기
  const openPostcode = () => {
    if (typeof window === "undefined") return;

    const run = () => {
      new window.daum!.Postcode({
        oncomplete: (data: any) => {
          // 기본 필드
          const zonecode = data.zonecode || "";
          const road = data.roadAddress || "";
          const jibun = data.jibunAddress || "";

          // 참고항목(동/건물명 등) 조합
          const extras: string[] = [];
          if (data.bname) extras.push(data.bname);
          if (data.buildingName) extras.push(data.buildingName);
          const extraText = extras.length ? `(${extras.join(", ")})` : "";

          // 상태 반영
          setPostNum(zonecode);
          setAddressRoad(road || jibun);       // 기본은 도로명, 없으면 지번
          setAddressExtra(extraText);
          setAddressDetail("");                // 상세는 사용자가 직접 입력
        },
      }).open();
    };

    // 일부 환경은 load 래핑 필요
    if (window.daum?.postcode?.load) window.daum.postcode.load(run);
    else if (window.daum?.Postcode) run();
    else alert("우편번호 스크립트가 아직 로드되지 않았습니다.");
  };

  // 비밀번호 변경: Boot PATCH (/api/mypage/changepwd)
  const changePassword = async () => {
    if (!pwdCurrent) return alert("현재 비밀번호를 입력하세요.");
    if (!pwdNew) return alert("새 비밀번호를 입력하세요.");
    if (!isPasswordValid(pwdNew)) return alert("비밀번호는 8자 이상, 영문/숫자/특수문자 포함");
    if (pwdNew !== pwdNewOk) return alert("비밀번호 확인이 일치하지 않습니다.");
    const payload = {
      currentPassword: pwdCurrent,
      newPassword: pwdNew,
      newPasswordConfirm: pwdNewOk,
    };
    try {
      const result = await patch<string>(`/mypage/changepwd`, payload);
      alert(result as unknown as string || "비밀번호 변경 성공");
      setPwdCurrent("");
      setPwdNew("");
      setPwdNewOk("");
    } catch (err: any) {
      console.error("[changePassword] error:", err);
      alert(err?.message || "비밀번호 변경 실패");
    }
  };

  // 계좌 인증
  const handleAccountVerify = async () => {
    if (!bankCode || !account) {
      alert("은행과 계좌번호를 모두 입력해주세요.");
      return;
    }
    try {
      const res = await verifyBankAccount(bankCode, account);
      const holder = res.data?.bankHolderInfo;
      if (holder) {
        setAccountOwner(holder);
        const loginName = member?.memberName?.trim() ?? "";
        if (loginName && holder.trim() === loginName) {
          setIsAccountVerified(true);
          setIsAccountEditing(false);
          alert("계좌 인증이 완료되었습니다.");
        } else {
          setIsAccountVerified(false);
          alert("예금주명이 로그인 사용자와 다릅니다.");
        }
      } else {
        alert("예금주 정보를 찾을 수 없습니다.");
      }
    } catch (err: any) {
      console.error("[handleAccountVerify] error:", err);
      alert("예금주 조회 중 오류가 발생했습니다.");
    }
  };

  // 계좌 수정 모드 활성화
  const handleAccountEdit = () => {
    setIsAccountEditing(true);
    setIsAccountVerified(false);
  };

  // 계좌 수정 취소
  const handleAccountCancel = () => {
    setAccount(savedAccountNum);
    setBankCode(savedBankCode);
    setAccountOwner(originalSellerData.accountOwner ?? member?.memberName ?? "");
    setIsAccountEditing(false);
    setIsAccountVerified(!!savedAccountNum);
  };

  // 이미지 파일 선택 처리 (미리보기만)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setProfileImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // 이미지 삭제
  const handleImageRemove = () => {
    setProfileImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 판매자 정보 저장 (계좌 + 이력)
  const saveSeller = async () => {
    const currentAccountNum = account;
    const currentBankCode = bankCode;
    const currentBankName = bankNameByCode(bankCode);

    // 계좌/은행 변경되었는데 인증 안했으면 막기
    if (
      (currentAccountNum !== savedAccountNum || currentBankCode !== savedBankCode) &&
      !isAccountVerified
    ) {
      alert("계좌 인증을 먼저 완료해주세요.");
      return;
    }
    if (!currentBankName) {
      alert("은행을 선택하세요.");
      return;
    }
    if (!currentAccountNum) {
      alert("계좌번호를 입력하세요.");
      return;
    }
    if (!accountOwner) {
      alert("예금주명을 확인할 수 없습니다. 계좌 인증을 진행하세요.");
      return;
    }

    const payload = {
      account: currentAccountNum,
      accountBank: currentBankName, // 서버는 '은행명' 기대
      accountOwner,                 // ✅ 인증으로 채워진 예금주명 저장
      profileInfo: careerText,
    };

    try {
      const env = await legacyPost<LegacyEnvelope<unknown>>(`/main/sell/info`, payload);
      const res = asApi(env);
      if (res.status === 200) {
        alert("판매자 정보 저장 성공");
        // 저장 기준값 업데이트
        setSavedAccountNum(currentAccountNum);
        setSavedBankCode(currentBankCode);
        await loadAll();
      } else {
        alert(res.message || "판매자 정보 저장 실패");
      }
    } catch (err: any) {
      console.error("[saveSeller] error:", err);
      alert(err?.message || "판매자 정보 저장 실패");
    }
  };

  /** 단일 컨테이너 컴포넌트: 검색~주문내역까지, 섹션 내부 분리 + 하단 패딩 */
  const Container = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden mb-6 pb-6">
      <div className="bg-gradient-to-r from-[#2d4739] to-gray-800 px-6 md:px-8 py-5 md:py-6">
        <h2 className="text-xl md:text-2xl text-white mb-1.5 md:mb-2">마이 정보 수정</h2>
        <p className="text-gray-200 text-xs md:text-sm">나의 정보를 확인하고 수정하세요</p>
      </div>
      <div className="p-4 md:p-6">{children}</div>
      {/* ⬇️ 컨테이너 자체 하단 패딩 확보 */}
      <div className="px-4 md:px-6 pt-2" />
    </div>
  );

  // 기존 state 선언 부분에 추가
const [isSellerInfoVisible, setIsSellerInfoVisible] = useState(false);

  /* ======================== JSX Return ======================== */
  return (
    <div className="min-h-screen font-jua" style={{ background: "linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)" }}>
      <Header />
      <Mainnavbar />

      {/* 모바일 상단바 */}
      <div className="lg:hidden"> 
          <MypageSidenavbar />

        {/* 모바일 컨텐츠 */}
        <div className="px-4">
          
          <Container>
            <div className="space-y-8">
              {/* 기본정보 섹션 */}
              <section className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">기본정보</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                    <input 
                      value={nameValue} 
                      readOnly 
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                    <input 
                      value={emailValue} 
                      readOnly 
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">연락처</label>
                    <input 
                      value={phoneValue} 
                      readOnly 
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                </div>
              </section>

              {/* 주소 섹션 */}
              <section className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">주소 정보</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">우편번호</label>
                    <div className="flex gap-2">
                      <input
                        placeholder="우편번호"
                        value={postNum}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
                      />
                      <button
                        type="button"
                        onClick={openPostcode}
                        className="px-4 py-2 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] whitespace-nowrap transition-colors"
                      >
                        찾기
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">도로명 주소</label>
                    <input
                      placeholder="도로명 주소"
                      value={addressRoad}
                      onChange={(e) => setAddressRoad(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">상세 주소</label>
                    <input
                      placeholder="상세 주소"
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">참고 항목</label>
                    <input
                      placeholder="참고 항목 (예: (동, 아파트))"
                      value={addressExtra}
                      onChange={(e) => setAddressExtra(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
                    />
                  </div>
                </div>
                <button 
                  onClick={saveAddress} 
                  className="w-full mt-6 px-4 py-2 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] transition-colors"
                >
                  주소 저장
                </button>
              </section>

              {/* 비밀번호 변경 섹션 */}
              <section className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">비밀번호 변경</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">현재 비밀번호</label>
                    <div className="relative">
                      <input
                        type={showCurrentPwd ? "text" : "password"}
                        placeholder="현재 비밀번호"
                        value={pwdCurrent}
                        onChange={(e) => setPwdCurrent(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPwd ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">새 비밀번호</label>
                    <div className="relative">
                      <input
                        type={showNewPwd ? "text" : "password"}
                        placeholder="새 비밀번호"
                        value={pwdNew}
                        onChange={(e) => setPwdNew(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd(!showNewPwd)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPwd ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">새 비밀번호 확인</label>
                    <div className="relative">
                      <input
                        type={showNewPwdOk ? "text" : "password"}
                        placeholder="새 비밀번호 확인"
                        value={pwdNewOk}
                        onChange={(e) => setPwdNewOk(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwdOk(!showNewPwdOk)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPwdOk ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={changePassword} 
                  className="w-full mt-6 px-4 py-2 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] transition-colors"
                >
                  비밀번호 변경
                </button>
              </section>

              {/* 판매자 정보 토글 섹션 */}
              <section className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                <button
                  onClick={() => setIsSellerInfoVisible(!isSellerInfoVisible)}
                  className="w-full flex items-center justify-between text-lg font-bold text-gray-900 hover:text-[#2d4739] transition-colors"
                >
                  <span>판매자 정보 확인하기</span>
                  <span className={`transform transition-transform ${isSellerInfoVisible ? 'rotate-180' : ''}`}>
                    ↓
                  </span>
                </button>

                {isSellerInfoVisible && (
                  <div className="mt-6 space-y-8">
                    {/* 계좌 정보 */}
                    <div className="border-t border-gray-100 pt-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-6">계좌 정보</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">은행</label>
                          {isAccountEditing ? (
                            <select
                              value={bankCode}
                              onChange={(e) => setBankCode(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
                            >
                              <option value="">선택</option>
                              {BANKS.map(b => (
                                <option key={b.code} value={b.code}>{b.name}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={bankNameByCode(bankCode)}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 font-medium"
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">계좌번호</label>
                          <input
                            placeholder="계좌번호"
                            value={account}
                            onChange={(e) => setAccount(e.target.value.replace(/[^0-9-]/g, ""))}
                            disabled={!isAccountEditing}
                            className={`w-full px-3 py-2 border border-gray-200 rounded-lg ${
                              isAccountEditing 
                                ? "focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]" 
                                : "bg-gray-50 text-gray-600"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">예금주명 (인증으로만 변경됨)</label>
                          <input
                            value={accountOwner}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 mt-6">
                        {isAccountEditing ? (
                          <>
                            <button 
                              onClick={handleAccountVerify} 
                              className="flex-1 px-4 py-2 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] transition-colors"
                            >
                              계좌 인증
                            </button>
                            {savedAccountNum && (
                              <button 
                                onClick={handleAccountCancel} 
                                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                              >
                                취소
                              </button>
                            )}
                          </>
                        ) : (
                          <button 
                            onClick={handleAccountEdit} 
                            className="w-full px-4 py-2 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] transition-colors"
                          >
                            수정
                          </button>
                        )}
                      </div>

                      {isAccountVerified && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                          <div className="text-green-700 text-sm font-medium">✓ 계좌 인증 완료</div>
                        </div>
                      )}
                    </div>

                    {/* 나의 이력 */}
                    <div className="border-t border-gray-100 pt-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-6">나의 이력</h3>

                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">프로필 이미지</label>
                          <div
                            className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors shadow-sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {profileImagePreview ? (
                              <img
                                src={profileImagePreview}
                                alt="프로필 미리보기"
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <div className="text-center text-gray-500">
                                <div className="text-2xl mb-1">+</div>
                                <div className="text-xs">이미지 선택</div>
                              </div>
                            )}
                          </div>

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />

                          {profileImagePreview && (
                            <button
                              onClick={handleImageRemove}
                              className="mt-2 px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                            >
                              이미지 삭제
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">나의 이력 (최대 150자)</label>
                          <textarea
                            placeholder="나의 이력을 입력해주세요..."
                            rows={5}
                            value={careerText}
                            onChange={(e) => setCareerText(e.target.value.slice(0, 150))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739] resize-none"
                          />
                          <div className="text-xs text-gray-500 mt-1 text-right">
                            {careerText.length}/150
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={saveSeller} 
                        className="w-full mt-6 px-4 py-2 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] transition-colors"
                      >
                        판매자 정보 저장
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* 디버그 정보 */}
              <section className="bg-gray-50 rounded-xl border border-gray-200 shadow-sm p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">디버그 정보</h4>
                <div className="space-y-1 text-xs text-gray-600">
                  <div>storeUrl: <code className="bg-white px-1 rounded">{legacyStore}</code></div>
                  <div>memberId: <code className="bg-white px-1 rounded">{member?.memberId ?? "-"}</code></div>
                  <div>계좌 인증 상태: <code className="bg-white px-1 rounded">{isAccountVerified ? "인증됨" : "미인증"}</code></div>
                  <div>수정 모드: <code className="bg-white px-1 rounded">{isAccountEditing ? "수정중" : "조회"}</code></div>
                </div>
              </section>
            </div>
          </Container>
        </div>

        {/* 페이지 바닥 여백 */}
        <div className="pb-6" />
      </div>

      {/* 데스크톱: 240 사이드 + 1440 컨텐츠 */}
      <div className="hidden lg:block">
        <MypageSidenavbar>
          <div className="mx-auto w-full max-w-[1440px] px-0">
            <Container>
              <div className="space-y-8">
                {/* 기본정보 섹션 */}
                <section className="bg-white rounded-xl border border-gray-200 shadow-lg p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-gray-900">기본정보</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">이름</label>
                      <input 
                        value={nameValue} 
                        readOnly 
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">이메일</label>
                      <input 
                        value={emailValue} 
                        readOnly 
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">연락처</label>
                      <input 
                        value={phoneValue} 
                        readOnly 
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>
                  </div>
                </section>

                {/* 주소 섹션 */}
                <section className="bg-white rounded-xl border border-gray-200 shadow-lg p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-8">주소 정보</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">우편번호</label>
                      <div className="flex gap-3">
                        <input
                          placeholder="우편번호"
                          value={postNum}
                          readOnly
                          className="flex-1 px-4 py-3 border border-gray-200 rounded-lg bg-gray-50"
                        />
                        <button
                          type="button"
                          onClick={openPostcode}
                          className="px-6 py-3 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] whitespace-nowrap transition-colors"
                        >
                          우편번호 찾기
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">참고 항목</label>
                      <input
                        placeholder="참고 항목 (예: (동, 아파트))"
                        value={addressExtra}
                        onChange={(e) => setAddressExtra(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">도로명 주소</label>
                      <input
                        placeholder="도로명 주소"
                        value={addressRoad}
                        onChange={(e) => setAddressRoad(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">상세 주소</label>
                      <input
                        placeholder="상세 주소"
                        value={addressDetail}
                        onChange={(e) => setAddressDetail(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-8">
                    <button 
                      onClick={saveAddress} 
                      className="px-8 py-3 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] transition-colors"
                    >
                      주소 저장
                    </button>
                  </div>
                </section>

                {/* 비밀번호 변경 섹션 */}
                <section className="bg-white rounded-xl border border-gray-200 shadow-lg p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-8">비밀번호 변경</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">현재 비밀번호</label>
                      <div className="relative">
                        <input
                          type={showCurrentPwd ? "text" : "password"}
                          placeholder="현재 비밀번호"
                          value={pwdCurrent}
                          onChange={(e) => setPwdCurrent(e.target.value)}
                          className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPwd ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">새 비밀번호</label>
                      <div className="relative">
                        <input
                          type={showNewPwd ? "text" : "password"}
                          placeholder="새 비밀번호"
                          value={pwdNew}
                          onChange={(e) => setPwdNew(e.target.value)}
                          className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPwd(!showNewPwd)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPwd ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">새 비밀번호 확인</label>
                      <div className="relative">
                        <input
                          type={showNewPwdOk ? "text" : "password"}
                          placeholder="새 비밀번호 확인"
                          value={pwdNewOk}
                          onChange={(e) => setPwdNewOk(e.target.value)}
                          className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPwdOk(!showNewPwdOk)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPwdOk ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-8">
                    <button 
                      onClick={changePassword} 
                      className="px-8 py-3 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] transition-colors"
                    >
                      비밀번호 변경
                    </button>
                  </div>
                </section>

                {/* 판매자 정보 토글 섹션 */}
                <section className="bg-white rounded-xl border border-gray-200 shadow-lg p-8" >
                  <button
                    onClick={() => setIsSellerInfoVisible(!isSellerInfoVisible)}
                    className="w-full flex items-center justify-between text-xl font-bold text-gray-900 hover:text-[#2d4739] transition-colors"
                  >
                    <span>판매자 정보 확인하기</span>
                    <span className={`transform transition-transform ${isSellerInfoVisible ? 'rotate-180' : ''}`}>
                      ↓
                    </span>
                  </button>

                  {isSellerInfoVisible && (
                    <div className="mt-8 space-y-8">
                      {/* 계좌 정보 섹션 */}
                      <div className="bg-gray-50 rounded-xl border border-gray-100 shadow-sm p-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-8">계좌 정보</h3>
                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">은행</label>
                            {isAccountEditing ? (
                              <select
                                value={bankCode}
                                onChange={(e) => setBankCode(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
                              >
                                <option value="">선택</option>
                                {BANKS.map(b => (
                                  <option key={b.code} value={b.code}>{b.name}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                value={bankNameByCode(bankCode)}
                                readOnly
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 font-medium"
                              />
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">계좌번호</label>
                            <input
                              placeholder="계좌번호"
                              value={account}
                              onChange={(e) => setAccount(e.target.value.replace(/[^0-9-]/g, ""))}
                              disabled={!isAccountEditing}
                              className={`w-full px-4 py-3 border border-gray-200 rounded-lg ${
                                isAccountEditing 
                                  ? "focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]" 
                                  : "bg-gray-50 text-gray-600"
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">예금주명 (인증으로만 변경됨)</label>
                            <input
                              value={accountOwner}
                              readOnly
                              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                          {isAccountEditing ? (
                            <>
                              <button 
                                onClick={handleAccountVerify} 
                                className="flex-1 px-6 py-3 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] transition-colors"
                              >
                                계좌 인증
                              </button>
                              {savedAccountNum && (
                                <button 
                                  onClick={handleAccountCancel} 
                                  className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                  취소
                                </button>
                              )}
                            </>
                          ) : (
                            <button 
                              onClick={handleAccountEdit} 
                              className="w-full px-6 py-3 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] transition-colors"
                            >
                              수정
                            </button>
                          )}
                        </div>

                        {isAccountVerified && (
                          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                            <div className="text-green-700 font-medium">✓ 계좌 인증 완료</div>
                          </div>
                        )}
                      </div>

                      {/* 나의 이력 섹션 */}
                      <div className="bg-gray-50 rounded-xl border border-gray-100 shadow-sm p-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-8">나의 이력</h3>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">프로필 이미지</label>
                            <div
                              className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer bg-white hover:bg-gray-50 transition-colors shadow-sm"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              {profileImagePreview ? (
                                <img
                                  src={profileImagePreview}
                                  alt="프로필 미리보기"
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <div className="text-center text-gray-500">
                                  <div className="text-3xl mb-2">+</div>
                                  <div className="text-sm">이미지 선택</div>
                                </div>
                              )}
                            </div>

                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden"
                            />

                            {profileImagePreview && (
                              <button
                                onClick={handleImageRemove}
                                className="mt-3 px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                              >
                                이미지 삭제
                              </button>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">나의 이력 (최대 150자)</label>
                            <textarea
                              placeholder="나의 이력을 입력해주세요..."
                              rows={6}
                              value={careerText}
                              onChange={(e) => setCareerText(e.target.value.slice(0, 150))}
                              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739] resize-none bg-white"
                            />
                            <div className="text-sm text-gray-500 mt-2 text-right">
                              {careerText.length}/150
                            </div>
                          </div>

                          <button 
                            onClick={saveSeller} 
                            className="w-full px-6 py-3 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] transition-colors"
                          >
                            판매자 정보 저장
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {/* 디버그 정보 */}
                <section className="bg-gray-50 rounded-xl border border-gray-200 shadow-sm p-6">
                  <h4 className="text-lg font-medium text-gray-700 mb-4">디버그 정보</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">storeUrl:</span>
                      <div className="mt-1">
                        <code className="bg-white px-2 py-1 rounded border shadow-sm">{legacyStore}</code>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">memberId:</span>
                      <div className="mt-1">
                        <code className="bg-white px-2 py-1 rounded border shadow-sm">{member?.memberId ?? "-"}</code>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">계좌 인증 상태:</span>
                      <div className="mt-1">
                        <code className="bg-white px-2 py-1 rounded border shadow-sm">{isAccountVerified ? "인증됨" : "미인증"}</code>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">수정 모드:</span>
                      <div className="mt-1">
                        <code className="bg-white px-2 py-1 rounded border shadow-sm">{isAccountEditing ? "수정중" : "조회"}</code>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </Container>
          </div>
        </MypageSidenavbar>
      </div>
    </div>
  );
}