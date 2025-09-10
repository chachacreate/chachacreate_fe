// src/domains/main/areas/mypage/pages/MainMypagePage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, MapPin, User, Lock, Banknote, FileText, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react";

import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import MypageSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar";

import { get, patch, legacyGet, legacyPost } from "@src/libs/request";
import type { ApiResponse } from "@src/libs/apiResponse";

/* ------------------------------ Consts ------------------------------ */
const BRAND = "#2D4739";
const CAREER_MAX = 150;

/* ------------------------------ Types ------------------------------- */
type Params = { storeUrl?: string };

type LegacyEnvelope<T> = {
  status: number;
  message?: string;
  data: T | null;
};

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

/** 판매자 정보(계좌/이력) */
type SellerInfo = {
  /** 은행 코드 (예: "004", "020" ...) */
  bankCode: string;
  /** 은행명 (옵션) */
  bankName?: string;
  /** 계좌번호 (하이픈 없이) */
  accountNumber: string;
  /** 예금주명 */
  accountOwner: string;
  /** 판매자 이력/소개 (최대 150자) */
  careerText: string;
  /** (옵션) 등록된 대표 이미지 URL */
  careerImageUrl?: string | null;
};

/* ----------------------------- Helpers ------------------------------ */
function asApi<T>(env: LegacyEnvelope<T>): ApiResponse<T> {
  return {
    status: env.status,
    message: env.message ?? "",
    data: env.data as T,
  };
}

const isPasswordValid = (pwd: string) => {
  const specialChars = `!"#$%&'()*+,-./:;<=>?@[\\]^_\`{|}~`;
  const specialPattern = new RegExp("[" + specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + "]");
  if (pwd.length < 8) return false;
  if (!/[a-zA-Z]/.test(pwd)) return false;
  if (!/[0-9]/.test(pwd)) return false;
  if (!specialPattern.test(pwd)) return false;
  return true;
};

/** (예시) 은행 목록 — 필요하면 서버에서 내려받도록 바꿔도 됨 */
const BANKS = [
  { code: "004", name: "국민은행" },
  { code: "020", name: "우리은행" },
  { code: "088", name: "신한은행" },
  { code: "003", name: "기업은행" },
  { code: "090", name: "카카오뱅크" },
  { code: "011", name: "농협은행" },
  { code: "027", name: "씨티은행" },
  { code: "071", name: "우체국" },
];

/* ---------------------------- Component ----------------------------- */
export default function MainMypagePage() {
  const { storeUrl } = useParams<Params>();
  const legacyStore = useMemo(() => storeUrl ?? "default", [storeUrl]);

  // base loading
  const [loading, setLoading] = useState(true);
  const [addrLoading, setAddrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // member
  const [member, setMember] = useState<Member | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // address
  const [address, setAddress] = useState<Address | null>(null);
  const [postNum, setPostNum] = useState("");
  const [addressRoad, setAddressRoad] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [addressExtra, setAddressExtra] = useState("");

  // password
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdNewOk, setPwdNewOk] = useState("");

  // ---------------------- Seller (계좌/이력) ----------------------
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [sellerOpen, setSellerOpen] = useState(false);

  // form states for seller
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountOwner, setAccountOwner] = useState(""); // 기본값: memberName
  const [careerText, setCareerText] = useState("");
  const [careerImage, setCareerImage] = useState<File | null>(null);
  const [careerPreview, setCareerPreview] = useState<string | null>(null);

  const accountEditable = useMemo(() => !!accountNumber, [accountNumber]);

  /* ------------------------ Load Member/Addr ------------------------ */
  const fetchMemberAndAddress = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Member (LEGACY)
      const memberEnv = await legacyGet<LegacyEnvelope<Member>>(`/legacy/${legacyStore}/mypage`);
      const memberRes = asApi(memberEnv);
      if (memberRes.status !== 200 || !memberRes.data) {
        throw new Error(memberRes.message || "회원 정보를 불러오지 못했습니다.");
      }
      const m = memberRes.data;
      setMember(m);
      setName(m.memberName ?? "");
      setPhone(m.memberPhone ?? "");
      setEmail(m.memberEmail ?? "");

      // Address (LEGACY)
      if (m.memberId) {
        setAddrLoading(true);
        const addrEnv = await legacyGet<LegacyEnvelope<Address>>(
          `http://localhost:8888/api/info/memberAddress/${m.memberId}`
        );
        const addrRes = asApi(addrEnv);
        if (addrRes.status === 200 && addrRes.data) {
          const a = addrRes.data;
          setAddress(a);
          setPostNum(a.postNum ?? "");
          setAddressRoad(a.addressRoad ?? "");
          setAddressDetail(a.addressDetail ?? "");
          setAddressExtra(a.addressExtra ?? "");
        } else {
          setAddress(null);
          setPostNum("");
          setAddressRoad("");
          setAddressDetail("");
          setAddressExtra("");
        }
      }

      // Seller Info (LEGACY)
      await fetchSellerInfo();
    } catch (e: any) {
      setError(e?.message ?? "정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setAddrLoading(false);
      setLoading(false);
    }
  }, [legacyStore]);

  /* ------------------------- Load Seller Info ----------------------- */
  const fetchSellerInfo = useCallback(async () => {
    try {
      setSellerLoading(true);
      // ⚠️ 실제 레거시 조회 엔드포인트로 교체
      const env = await legacyGet<LegacyEnvelope<SellerInfo>>(
        `/legacy/${legacyStore}/mypage/seller`
      );
      const res = asApi(env);
      if (res.status === 200 && res.data) {
        setSellerInfo(res.data);
        setBankCode(res.data.bankCode ?? "");
        setAccountNumber(res.data.accountNumber ?? "");
        setAccountOwner(res.data.accountOwner ?? "");
        setCareerText(res.data.careerText ?? "");
        setCareerPreview(res.data.careerImageUrl || null);
      } else {
        // 최초 미등록 상태: 예금주는 기본값으로 회원명
        // (없으면 비워둬도 됨)
        setSellerInfo(null);
        setAccountOwner((member?.memberName ?? "").toString());
      }
    } catch (err) {
      // 미등록이면 404일 수 있음 → 조용히 무시
      setSellerInfo(null);
      if (member?.memberName) setAccountOwner(member.memberName);
    } finally {
      setSellerLoading(false);
    }
  }, [legacyStore, member?.memberName]);

  useEffect(() => {
    fetchMemberAndAddress();
  }, [fetchMemberAndAddress]);

  /* --------------------------- Postcode ----------------------------- */
  const openDaumPostcode = () => {
    const win: any = window as any;
    if (!win.daum || !win.daum.Postcode) {
      alert("주소 검색 스크립트를 불러올 수 없습니다.");
      return;
    }
    new win.daum.Postcode({
      oncomplete: (data: any) => {
        let addr = "";
        let extraAddr = "";

        if (data.userSelectedType === "R") addr = data.roadAddress;
        else addr = data.jibunAddress;

        if (data.userSelectedType === "R") {
          if (data.bname !== "" && /[동|로|가]$/g.test(data.bname)) extraAddr += data.bname;
          if (data.buildingName !== "" && data.apartment === "Y") {
            extraAddr += (extraAddr !== "" ? ", " + data.buildingName : data.buildingName);
          }
          if (extraAddr !== "") extraAddr = " (" + extraAddr + ")";
        }

        setPostNum(data.zonecode || "");
        setAddressRoad(addr || "");
        setAddressExtra(extraAddr || "");
        setTimeout(() => {
          document.querySelector<HTMLInputElement>("#address-detail-input")?.focus();
        }, 10);
      },
    }).open();
  };

  /* -------------------------- Save (Top) ---------------------------- */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) {
      alert("회원 정보를 불러오지 못했습니다.");
      return;
    }

    const isPasswordChanged = !!pwdNew;
    const isAddressChanged =
      postNum !== (address?.postNum ?? "") ||
      addressRoad !== (address?.addressRoad ?? "") ||
      addressDetail !== (address?.addressDetail ?? "") ||
      (addressExtra || "") !== (address?.addressExtra || "");

    // 비밀번호
    if (isPasswordChanged) {
      if (!isPasswordValid(pwdNew)) {
        alert("비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 포함해야 합니다.");
        return;
      }
      if (pwdNew !== pwdNewOk) {
        alert("새 비밀번호와 확인이 일치하지 않습니다.");
        return;
      }
      const body = {
        currentPassword: pwdCurrent,
        newPassword: pwdNew,
        newPasswordConfirm: pwdNewOk,
      };
      try {
        const resp = await patch<unknown>("/api/mypage/changepwd", body);
        if (resp.status === 200) {
          alert("비밀번호가 성공적으로 수정되었습니다.");
          setPwdCurrent("");
          setPwdNew("");
          setPwdNewOk("");
        } else {
          alert(`비밀번호 수정 실패: ${resp.message ?? "오류"}`);
          return;
        }
      } catch (err: any) {
        alert(`비밀번호 수정 중 오류가 발생했습니다: ${err?.message ?? "알 수 없는 오류"}`);
        return;
      }
    }

    // 주소
    if (isAddressChanged) {
      if (!postNum || !addressRoad) {
        alert("우편번호와 주소를 모두 입력해주세요.");
        return;
      }
      const addrPayload: Address = {
        postNum,
        addressRoad,
        addressDetail,
        addressExtra,
      };
      try {
        const env = await legacyPost<LegacyEnvelope<unknown>>(
          `/legacy/${legacyStore}/mypage/order/addr/update`,
          addrPayload
        );
        const resp = asApi(env);
        if (resp.status === 200) {
          alert("주소가 성공적으로 수정되었습니다.");
          setAddress(addrPayload);
        } else {
          alert(`주소 수정 실패: ${resp.message ?? "오류"}`);
        }
      } catch (err: any) {
        alert(`주소 수정 중 오류가 발생했습니다: ${err?.message ?? "알 수 없는 오류"}`);
      }
    }
  };

  /* ----------------------- Seller Save/Upload ----------------------- */
  const onClickAccountVerify = async () => {
    if (!bankCode || !accountNumber || !accountOwner) {
      alert("은행, 계좌번호, 예금주명을 모두 입력해주세요.");
      return;
    }
    // ⚠️ 실계좌 인증 API가 별도로 있으면 여기서 호출하세요.
    alert("계좌 형식이 유효합니다. (실제 인증 API 연동 필요)");
  };

  const onClickAccountEdit = () => {
    // 현 구조에서는 인풋이 항상 수정 가능하므로 별도 토글 없어도 됨
    // 필요 시 상태를 두고 disable/enable 전환 가능
    alert("계좌 정보를 수정할 수 있습니다.");
  };

  const onChangeCareerFile = (f: File | null) => {
    setCareerImage(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setCareerPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setCareerPreview(null);
    }
  };

  const saveSellerAll = async () => {
    if (careerText.length > CAREER_MAX) {
      alert(`이력 설명은 최대 ${CAREER_MAX}자까지만 입력 가능합니다.`);
      return;
    }
    if (!bankCode || !accountNumber || !accountOwner) {
      alert("은행/계좌/예금주를 확인해주세요.");
      return;
    }

    // 1) 이미지 업로드 (선택)
    let uploadedImageUrl: string | undefined = sellerInfo?.careerImageUrl || undefined;
    if (careerImage) {
      try {
        const form = new FormData();
        form.append("file", careerImage);
        // ⚠️ 실제 업로드 엔드포인트로 교체
        const env = await legacyPost<LegacyEnvelope<{ url: string }>>(
          `/legacy/${legacyStore}/mypage/seller/career-image`,
          form as any
        );
        const res = asApi(env);
        if (res.status === 200 && res.data?.url) {
          uploadedImageUrl = res.data.url;
        } else {
          alert("이미지 업로드에 실패했습니다. (선택 사항이므로 계속 진행 가능합니다)");
        }
      } catch {
        alert("이미지 업로드 중 오류가 발생했습니다. (선택 사항이므로 계속 진행 가능합니다)");
      }
    }

    // 2) 판매자 정보 저장
    const payload: SellerInfo = {
      bankCode,
      bankName: BANKS.find((b) => b.code === bankCode)?.name,
      accountNumber,
      accountOwner,
      careerText,
      careerImageUrl: uploadedImageUrl ?? null,
    };

    try {
      // ⚠️ 실제 저장 엔드포인트로 교체
      const env = await legacyPost<LegacyEnvelope<unknown>>(
        `/legacy/${legacyStore}/mypage/seller`,
        payload
      );
      const res = asApi(env);
      if (res.status === 200) {
        alert("판매자 정보가 저장되었습니다.");
        setSellerInfo(payload);
      } else {
        alert(res.message || "판매자 정보 저장에 실패했습니다.");
      }
    } catch (err: any) {
      alert(`판매자 정보 저장 중 오류가 발생했습니다: ${err?.message ?? "알 수 없는 오류"}`);
    }
  };

  /* ----------------------------- UI States -------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen font-jua" style={{ background: "linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)" }}>
        <Header />
        <Mainnavbar />
        <MypageSidenavbar>
          <div className="flex items-center justify-center h-96">
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              불러오는 중…
            </div>
          </div>
        </MypageSidenavbar>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen font-jua" style={{ background: "linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)" }}>
        <Header />
        <Mainnavbar />
        <MypageSidenavbar>
          <div className="p-6">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>
          </div>
        </MypageSidenavbar>
      </div>
    );
  }

  /* -------------------------------- View ---------------------------- */
  return (
    <div className="min-h-screen font-jua" style={{ background: "linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)" }}>
      <Header />
      <Mainnavbar />

      <MypageSidenavbar>
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-[#2d4739] to-gray-800 px-6 md:px-8 py-5 md:py-6">
              <h2 className="text-xl md:text-2xl text-white mb-1.5 md:mb-2">마이페이지</h2>
              <p className="text-gray-200 text-xs md:text-sm">개인정보와 주소, 판매자 정보를 안전하게 관리하세요</p>
            </div>

            {/* 본문 */}
            <form className="p-6 md:p-8 space-y-8" onSubmit={onSubmit}>
              {/* 기본 정보 */}
              <section className="bg-gray-50 rounded-xl p-5 md:p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#2d4739]" />
                  기본 정보
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-700">이름</label>
                    <input value={name} disabled readOnly className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 focus:outline-none" />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm text-gray-700">이메일</label>
                    <input value={email} disabled readOnly className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 focus:outline-none" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm text-gray-700">연락처</label>
                    <input value={phone} disabled readOnly className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 focus:outline-none" />
                  </div>
                </div>
              </section>

              {/* 비밀번호 변경 */}
              <section className="bg-blue-50 rounded-xl p-5 md:p-6 border border-blue-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-600" />
                  비밀번호 변경
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-700">현재 비밀번호</label>
                    <input
                      type="password"
                      value={pwdCurrent}
                      onChange={(e) => setPwdCurrent(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="현재 비밀번호를 입력하세요"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm text-gray-700">새 비밀번호</label>
                      <input
                        type="password"
                        value={pwdNew}
                        onChange={(e) => setPwdNew(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="새 비밀번호"
                      />
                      {pwdNew.length > 0 && !isPasswordValid(pwdNew) && (
                        <p className="text-xs text-rose-600 mt-1">8자 이상, 영문/숫자/특수문자를 포함해야 합니다.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm text-gray-700">새 비밀번호 확인</label>
                      <input
                        type="password"
                        value={pwdNewOk}
                        onChange={(e) => setPwdNewOk(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        placeholder="비밀번호 확인"
                      />
                      {pwdNewOk.length > 0 && pwdNew !== pwdNewOk && (
                        <p className="text-xs text-rose-600 mt-1">비밀번호가 일치하지 않습니다.</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* 주소 정보 */}
              <section className="bg-green-50 rounded-xl p-5 md:p-6 border border-green-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  주소 정보
                </h3>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      value={postNum}
                      onChange={(e) => setPostNum(e.target.value)}
                      placeholder="우편번호"
                      className="px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 focus:outline-none sm:w-[160px]"
                      disabled={addrLoading}
                    />
                    <button
                      type="button"
                      onClick={openDaumPostcode}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition font-medium"
                      disabled={addrLoading}
                    >
                      주소 검색
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm text-gray-700">도로명 주소</label>
                    <input
                      value={addressRoad}
                      onChange={(e) => setAddressRoad(e.target.value)}
                      placeholder="주소"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                      disabled={addrLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm text-gray-700">상세 주소</label>
                    <input
                      id="address-detail-input"
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      placeholder="상세주소"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                      disabled={addrLoading}
                    />
                    {addressExtra && <p className="text-xs text-gray-500">참고항목: {addressExtra}</p>}
                  </div>
                </div>
              </section>

              {/* =================== 판매자 정보 관리 (추가) =================== */}
              <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {/* 토글 헤더 */}
                <button
                  type="button"
                  onClick={() => setSellerOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white"
                >
                  <div className="flex items-center gap-2">
                    <Banknote className="w-5 h-5" />
                    <span className="font-semibold">판매자 정보 관리</span>
                  </div>
                  {sellerOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {sellerOpen && (
                  <div className="p-6 space-y-8">
                    {/* 계좌 등록 */}
                    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-5 py-4 bg-blue-600 text-white flex items-center gap-2">
                        <Banknote className="w-5 h-5" />
                        <span className="font-semibold">계좌 등록하기</span>
                      </div>

                      <div className="p-5 space-y-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">예금주명</label>
                          <input
                            value={accountOwner}
                            onChange={(e) => setAccountOwner(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"
                            placeholder="예금주명"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">은행 선택</label>
                          <select
                            value={bankCode}
                            onChange={(e) => setBankCode(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">은행을 선택해주세요</option>
                            {BANKS.map((b) => (
                              <option key={b.code} value={b.code}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">계좌번호</label>
                          <input
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="계좌번호 (-없이 입력)"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={onClickAccountVerify}
                              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
                            >
                              계좌 인증
                            </button>
                            {accountEditable && (
                              <button
                                type="button"
                                onClick={onClickAccountEdit}
                                className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition font-medium"
                              >
                                수정하기
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* 나의 이력 등록 */}
                    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-5 py-4 bg-green-600 text-white flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        <span className="font-semibold">나의 이력 등록하기</span>
                      </div>

                      <div className="p-5 space-y-5">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">이력 설명</label>
                          <textarea
                            rows={4}
                            value={careerText}
                            onChange={(e) => setCareerText(e.target.value.slice(0, CAREER_MAX))}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                            placeholder="판매자님의 경력과 전문분야를 소개해주세요 (최대 150자)"
                          />
                          <div className="text-sm text-gray-500 text-right">
                            {careerText.length}/{CAREER_MAX}
                          </div>
                        </div>

                        {/* (선택) 이미지 업로드 */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">대표 이미지 (선택)</label>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer hover:bg-gray-50">
                              <ImageIcon className="w-4 h-4 text-gray-600" />
                              <span>이미지 선택</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => onChangeCareerFile(e.target.files?.[0] ?? null)}
                              />
                            </label>
                            {careerPreview && (
                              <img
                                src={careerPreview}
                                alt="preview"
                                className="w-16 h-16 rounded-lg border object-cover"
                              />
                            )}
                          </div>
                          <p className="text-xs text-gray-500">jpg, png, gif 권장</p>
                        </div>
                      </div>
                    </section>

                    {/* 판매자 저장 액션 */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="button"
                        onClick={saveSellerAll}
                        className="flex-1 sm:flex-none px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-semibold shadow"
                      >
                        모든 정보 저장
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // 폼 초기화(서버값 기준)
                          if (sellerInfo) {
                            setBankCode(sellerInfo.bankCode ?? "");
                            setAccountNumber(sellerInfo.accountNumber ?? "");
                            setAccountOwner(sellerInfo.accountOwner ?? "");
                            setCareerText(sellerInfo.careerText ?? "");
                            setCareerPreview(sellerInfo.careerImageUrl || null);
                            setCareerImage(null);
                          } else {
                            setBankCode("");
                            setAccountNumber("");
                            setAccountOwner(member?.memberName ?? "");
                            setCareerText("");
                            setCareerPreview(null);
                            setCareerImage(null);
                          }
                        }}
                        className="flex-1 sm:flex-none px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition font-medium"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* 상단 저장/취소 */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 sm:flex-none px-8 py-3 text-white rounded-xl hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-brand-900 transition font-semibold shadow"
                  style={{ backgroundColor: BRAND }}
                >
                  변경사항 저장
                </button>
                <button
                  type="button"
                  className="flex-1 sm:flex-none px-8 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition font-medium"
                  onClick={() => {
                    // 기본 정보/주소 폼 초기화
                    if (member) {
                      setName(member.memberName ?? "");
                      setPhone(member.memberPhone ?? "");
                      setEmail(member.memberEmail ?? "");
                    }
                    if (address) {
                      setPostNum(address.postNum ?? "");
                      setAddressRoad(address.addressRoad ?? "");
                      setAddressDetail(address.addressDetail ?? "");
                      setAddressExtra(address.addressExtra ?? "");
                    }
                    setPwdCurrent("");
                    setPwdNew("");
                    setPwdNewOk("");
                  }}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      </MypageSidenavbar>
    </div>
  );
}
