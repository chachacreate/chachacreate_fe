// src/domains/main/areas/mypage/pages/MypageApiSmokeTest.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef, memo } from 'react';
import { useParams } from 'react-router-dom';

// 컴포넌트 imports
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import MypageSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar';
import Storenavbar from '@src/shared/areas/navigation/features/navbar/store/Storenavbar';

// 요청 유틸
import { get, patch, legacyGet, legacyPost } from '@src/libs/request';
import { isLoggedIn } from '@src/shared/util/jwtUtils';

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
  accountBank?: string;
  accountOwner?: string;
  profileInfo?: string;
  profileImageName?: string;
};

type BankVerifyResponse = {
  bankHolderInfo?: string;
};

/* ======================== Helpers ======================== */
function asApi<T>(env: LegacyEnvelope<T>): ApiResponse<T> {
  return { status: env.status, message: env.message ?? '', data: env.data as T };
}

const BANKS = [
  { code: '004', name: '국민은행' },
  { code: '020', name: '우리은행' },
  { code: '088', name: '신한은행' },
  { code: '003', name: '기업은행' },
  { code: '023', name: 'SC제일은행' },
  { code: '011', name: '농협은행' },
  { code: '005', name: '외환은행' },
  { code: '090', name: '카카오뱅크' },
  { code: '032', name: '부산은행' },
  { code: '071', name: '우체국' },
  { code: '031', name: '대구은행' },
  { code: '037', name: '전북은행' },
  { code: '035', name: '제주은행' },
  { code: '007', name: '수협은행' },
  { code: '027', name: '씨티은행' },
  { code: '039', name: '경남은행' },
];

const bankNameByCode = (code: string) => BANKS.find((b) => b.code === code)?.name ?? '';
const bankCodeByName = (name: string) => BANKS.find((b) => b.name === name)?.code ?? '';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isPasswordValid = (pwd: string) => {
  const special = new RegExp('[' + escapeRegExp(`!"#$%&'()*+,-./:;<=>?@[\\]^_\`{|}~`) + ']');
  return pwd.length >= 8 && /[a-zA-Z]/.test(pwd) && /[0-9]/.test(pwd) && special.test(pwd);
};

/* ======================== Sub Components ======================== */

// 기본정보 컴포넌트 (읽기 전용)
const BasicInfoSection = memo(({ member }: { member: Member | null }) => {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <h3 className="text-lg lg:text-xl font-bold text-gray-900">기본정보</h3>
      </div>
      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-3">이름</label>
          <input
            value={member?.memberName || ''}
            readOnly
            className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-3">이메일</label>
          <input
            value={member?.memberEmail || ''}
            readOnly
            className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-3">연락처</label>
          <input
            value={member?.memberPhone || ''}
            readOnly
            className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
          />
        </div>
      </div>
    </section>
  );
});

// 주소 컴포넌트 (자체 상태 관리)
const AddressSection = memo(
  ({ member, initialAddress }: { member: Member | null; initialAddress: Address | null }) => {
    const [postNum, setPostNum] = useState('');
    const [addressRoad, setAddressRoad] = useState('');
    const [addressDetail, setAddressDetail] = useState('');
    const [addressExtra, setAddressExtra] = useState('');

    useEffect(() => {
      if (initialAddress) {
        setPostNum(initialAddress.postNum || '');
        setAddressRoad(initialAddress.addressRoad || '');
        setAddressDetail(initialAddress.addressDetail || '');
        setAddressExtra(initialAddress.addressExtra || '');
      }
    }, [initialAddress]);

    const openPostcode = useCallback(() => {
      if (typeof window === 'undefined') return;

      const run = () => {
        new window.daum!.Postcode({
          oncomplete: (data: any) => {
            const zonecode = data.zonecode || '';
            const road = data.roadAddress || '';
            const jibun = data.jibunAddress || '';
            const extras: string[] = [];
            if (data.bname) extras.push(data.bname);
            if (data.buildingName) extras.push(data.buildingName);
            const extraText = extras.length ? `(${extras.join(', ')})` : '';

            setPostNum(zonecode);
            setAddressRoad(road || jibun);
            setAddressExtra(extraText);
            setAddressDetail('');
          },
        }).open();
      };

      if (window.daum?.postcode?.load) window.daum.postcode.load(run);
      else if (window.daum?.Postcode) run();
      else alert('우편번호 스크립트가 아직 로드되지 않았습니다.');
    }, []);

    const saveAddress = useCallback(async () => {
      if (!member) return alert('member 없음');
      const addressData = { postNum, addressRoad, addressDetail, addressExtra };
      try {
        const result = await patch<any>(`/mypage/changeaddr`, addressData);
        if (result.status === 200) {
          alert('주소 저장 성공');
        } else {
          alert('주소 저장 실패');
        }
      } catch (err: any) {
        console.error('[saveAddress] error:', err);
        alert('api 호출 실패');
      }
    }, [member, postNum, addressRoad, addressDetail, addressExtra]);

    return (
      <section className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 lg:p-8">
        <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-6 lg:mb-8">주소 정보</h3>
        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-3">우편번호</label>
            <div className="flex gap-2 lg:gap-3">
              <input
                placeholder="우편번호"
                value={postNum}
                readOnly
                className="flex-1 px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-lg bg-gray-50"
              />
              <button
                type="button"
                onClick={openPostcode}
                className="px-4 lg:px-6 py-2 lg:py-3 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] whitespace-nowrap transition-colors"
              >
                <span className="lg:hidden">찾기</span>
                <span className="hidden lg:inline">우편번호 찾기</span>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-3">
              참고 항목
            </label>
            <input
              placeholder="참고 항목 (예: (동, 아파트))"
              value={addressExtra}
              onChange={(e) => setAddressExtra(e.target.value)}
              className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-3">
              도로명 주소
            </label>
            <input
              placeholder="도로명 주소"
              value={addressRoad}
              onChange={(e) => setAddressRoad(e.target.value)}
              className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-3">
              상세 주소
            </label>
            <input
              placeholder="상세 주소"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
            />
          </div>
        </div>
        <div className="mt-6 lg:mt-8 lg:flex lg:justify-end">
          <button
            onClick={saveAddress}
            className="w-full lg:w-auto px-4 lg:px-8 py-2 lg:py-3 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] transition-colors"
          >
            주소 저장
          </button>
        </div>
      </section>
    );
  }
);

// 비밀번호 변경 컴포넌트 (자체 상태 관리)
const PasswordSection = memo(() => {
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdNewOk, setPwdNewOk] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showNewPwdOk, setShowNewPwdOk] = useState(false);

  const changePassword = useCallback(async () => {
    if (!pwdCurrent) return alert('현재 비밀번호를 입력하세요.');
    if (!pwdNew) return alert('새 비밀번호를 입력하세요.');
    if (!isPasswordValid(pwdNew)) return alert('비밀번호는 8자 이상, 영문/숫자/특수문자 포함');
    if (pwdNew !== pwdNewOk) return alert('비밀번호 확인이 일치하지 않습니다.');

    const payload = {
      currentPassword: pwdCurrent,
      newPassword: pwdNew,
      newPasswordConfirm: pwdNewOk,
    };

    try {
      const result = await patch<string>(`/mypage/changepwd`, payload);
      alert((result as unknown as string) || '비밀번호 변경 성공');
      setPwdCurrent('');
      setPwdNew('');
      setPwdNewOk('');
    } catch (err: any) {
      console.error('[changePassword] error:', err);
      alert(err?.message || '비밀번호 변경 실패');
    }
  }, [pwdCurrent, pwdNew, pwdNewOk]);

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 lg:p-8">
      <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-6 lg:mb-8">비밀번호 변경</h3>
      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-3">
            현재 비밀번호
          </label>
          <div className="relative">
            <input
              type={showCurrentPwd ? 'text' : 'password'}
              placeholder="현재 비밀번호"
              value={pwdCurrent}
              onChange={(e) => setPwdCurrent(e.target.value)}
              className="w-full px-3 lg:px-4 py-2 lg:py-3 pr-10 lg:pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPwd(!showCurrentPwd)}
              className="absolute right-3 lg:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showCurrentPwd ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-3">
            새 비밀번호
          </label>
          <div className="relative">
            <input
              type={showNewPwd ? 'text' : 'password'}
              placeholder="새 비밀번호"
              value={pwdNew}
              onChange={(e) => setPwdNew(e.target.value)}
              className="w-full px-3 lg:px-4 py-2 lg:py-3 pr-10 lg:pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
            />
            <button
              type="button"
              onClick={() => setShowNewPwd(!showNewPwd)}
              className="absolute right-3 lg:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showNewPwd ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-3">
            새 비밀번호 확인
          </label>
          <div className="relative">
            <input
              type={showNewPwdOk ? 'text' : 'password'}
              placeholder="새 비밀번호 확인"
              value={pwdNewOk}
              onChange={(e) => setPwdNewOk(e.target.value)}
              className="w-full px-3 lg:px-4 py-2 lg:py-3 pr-10 lg:pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
            />
            <button
              type="button"
              onClick={() => setShowNewPwdOk(!showNewPwdOk)}
              className="absolute right-3 lg:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showNewPwdOk ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-6 lg:mt-8 lg:flex lg:justify-end">
        <button
          onClick={changePassword}
          className="w-full lg:w-auto px-4 lg:px-8 py-2 lg:py-3 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] transition-colors"
        >
          비밀번호 변경
        </button>
      </div>
    </section>
  );
});

// 계좌 정보 컴포넌트 (자체 상태 관리)
const AccountSection = memo(
  ({
    member,
    initialSellerData,
    onAccountDataChange,
  }: {
    member: Member | null;
    initialSellerData: SellerLegacy | null;
    onAccountDataChange: (data: {
      bankCode: string;
      account: string;
      accountOwner: string;
      isVerified: boolean;
    }) => void;
  }) => {
    const [bankCode, setBankCode] = useState('');
    const [account, setAccount] = useState('');
    const [accountOwner, setAccountOwner] = useState('');
    const [isAccountEditing, setIsAccountEditing] = useState(false);
    const [isAccountVerified, setIsAccountVerified] = useState(false);
    const [savedAccountNum, setSavedAccountNum] = useState('');
    const [savedBankCode, setSavedBankCode] = useState('');

    // 계좌 데이터가 변경될 때마다 상위로 전달
    useEffect(() => {
      onAccountDataChange({
        bankCode,
        account,
        accountOwner,
        isVerified: isAccountVerified,
      });
    }, [bankCode, account, accountOwner, isAccountVerified, onAccountDataChange]);

    // 초기값 설정
    useEffect(() => {
      if (initialSellerData) {
        const bankCodeValue = bankCodeByName(initialSellerData.accountBank || '');
        setAccount(initialSellerData.account || '');
        setBankCode(bankCodeValue);
        setAccountOwner(initialSellerData.accountOwner || member?.memberName || '');
        setSavedAccountNum(initialSellerData.account || '');
        setSavedBankCode(bankCodeValue);
        setIsAccountVerified(!!initialSellerData.account);
        setIsAccountEditing(!initialSellerData.account);
      } else if (member) {
        setAccount('');
        setBankCode('');
        setAccountOwner(member.memberName || '');
        setSavedAccountNum('');
        setSavedBankCode('');
        setIsAccountVerified(false);
        setIsAccountEditing(true);
      }
    }, [initialSellerData, member]);

    const verifyBankAccount = useCallback(async (bankCode: string, accountNum: string) => {
      const clean = accountNum.replace(/[^0-9]/g, '');
      const data = await legacyGet<BankVerifyResponse>(
        `/common/bank?bank_code=${encodeURIComponent(bankCode)}&bank_num=${encodeURIComponent(clean)}`
      );
      // console.log('data 확인: ', data);

      const env = { status: 200, message: '인증 완료', data: data };
      return asApi(env);
    }, []);

    const handleAccountVerify = useCallback(async () => {
      if (!bankCode || !account) {
        alert('은행과 계좌번호를 모두 입력해주세요.');
        return;
      }
      try {
        const res = await verifyBankAccount(bankCode, account);
        // console.log('res check: ', res);
        const holder = res.data?.bankHolderInfo;
        // console.log('holder check: ', holder);
        if (holder) {
          setAccountOwner(holder);
          const loginName = member?.memberName?.trim() ?? '';
          // console.log('loginName check: ', loginName);
          if (loginName && holder.trim() === loginName) {
            setIsAccountVerified(true);
            setIsAccountEditing(false);
            alert('계좌 인증이 완료되었습니다.');
          } else {
            setIsAccountVerified(false);
            alert('예금주명이 로그인 사용자와 다릅니다.');
          }
        } else {
          alert('예금주 정보를 찾을 수 없습니다.');
        }
      } catch (err: any) {
        console.error('[handleAccountVerify] error:', err);
        alert('예금주 조회 중 오류가 발생했습니다.');
      }
    }, [bankCode, account, member?.memberName, verifyBankAccount]);

    const handleAccountEdit = useCallback(() => {
      setIsAccountEditing(true);
      setIsAccountVerified(false);
    }, []);

    const handleAccountCancel = useCallback(() => {
      setAccount(savedAccountNum);
      setBankCode(savedBankCode);
      setAccountOwner(initialSellerData?.accountOwner || member?.memberName || '');
      setIsAccountEditing(false);
      setIsAccountVerified(!!savedAccountNum);
    }, [savedAccountNum, savedBankCode, initialSellerData?.accountOwner, member?.memberName]);

    return (
      <div className="bg-gray-50 rounded-xl border border-gray-100 shadow-sm p-6 lg:p-8">
        <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-6 lg:mb-8">계좌 정보</h3>
        <div className="space-y-4 lg:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-3">은행</label>
            {isAccountEditing ? (
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]"
              >
                <option value="">선택</option>
                {BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={bankNameByCode(bankCode)}
                readOnly
                className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 font-medium"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-3">계좌번호</label>
            <input
              placeholder="계좌번호"
              value={account}
              onChange={(e) => setAccount(e.target.value.replace(/[^0-9-]/g, ''))}
              disabled={!isAccountEditing}
              className={`w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-lg ${
                isAccountEditing
                  ? 'focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739]'
                  : 'bg-gray-50 text-gray-600'
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-3">
              예금주명 (인증으로만 변경됨)
            </label>
            <input
              value={accountOwner}
              readOnly
              className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>
        </div>

        <div className="flex gap-2 lg:gap-3 mt-6 lg:mt-8">
          {isAccountEditing ? (
            <>
              <button
                onClick={handleAccountVerify}
                className="flex-1 px-4 lg:px-6 py-2 lg:py-3 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] transition-colors"
              >
                계좌 인증
              </button>
              {savedAccountNum && (
                <button
                  onClick={handleAccountCancel}
                  className="flex-1 px-4 lg:px-6 py-2 lg:py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  취소
                </button>
              )}
            </>
          ) : (
            <button
              onClick={handleAccountEdit}
              className="w-full px-4 lg:px-6 py-2 lg:py-3 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] transition-colors"
            >
              수정
            </button>
          )}
        </div>

        {isAccountVerified && (
          <div className="mt-4 lg:mt-6 p-3 lg:p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
            <div className="text-green-700 text-sm lg:text-base font-medium">✓ 계좌 인증 완료</div>
          </div>
        )}
      </div>
    );
  }
);

// 이력 정보 컴포넌트 (자체 상태 관리)
const CareerSection = memo(
  ({
    initialSellerData,
    accountData,
    onRefresh,
  }: {
    initialSellerData: SellerLegacy | null;
    accountData: { bankCode: string; account: string; accountOwner: string; isVerified: boolean };
    onRefresh: () => void;
  }) => {
    const [careerText, setCareerText] = useState('');
    const [profileImagePreview, setProfileImagePreview] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 초기값 설정
    useEffect(() => {
      if (initialSellerData) {
        setCareerText(initialSellerData.profileInfo || '');
        if (initialSellerData.profileImageName) {
          setProfileImagePreview(`/resources/profileImages/${initialSellerData.profileImageName}`);
        }
      }
    }, [initialSellerData]);

    const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => setProfileImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
      }
    }, []);

    const handleImageRemove = useCallback(() => {
      setProfileImagePreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const handleImageClick = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    const saveSeller = useCallback(async () => {
      const currentBankName = bankNameByCode(accountData.bankCode);

      if (!accountData.isVerified) {
        alert('계좌 인증을 먼저 완료해주세요.');
        return;
      }
      if (!currentBankName) {
        alert('은행을 선택하세요.');
        return;
      }
      if (!accountData.account) {
        alert('계좌번호를 입력하세요.');
        return;
      }
      if (!accountData.accountOwner) {
        alert('예금주명을 확인할 수 없습니다. 계좌 인증을 진행하세요.');
        return;
      }

      const payload = {
        account: accountData.account,
        accountBank: currentBankName,
        accountOwner: accountData.accountOwner,
        profileInfo: careerText,
      };

      try {
        const env = await legacyPost<LegacyEnvelope<unknown>>(`/main/sell/info`, payload);
        const res = asApi(env);
        if (res.status === 200) {
          alert('판매자 정보 저장 성공');
          onRefresh();
        } else {
          alert(res.message || '판매자 정보 저장 실패');
        }
      } catch (err: any) {
        console.error('[saveSeller] error:', err);
        alert(err?.message || '판매자 정보 저장 실패');
      }
    }, [accountData, careerText, onRefresh]);

    return (
      <div className="bg-gray-50 rounded-xl border border-gray-100 shadow-sm p-6 lg:p-8">
        <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-6 lg:mb-8">나의 이력</h3>

        <div className="space-y-6">
          {/* 이력 이미지의 경우 현재 지원 안 되는 기능이므로 주석 처리 */}
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-3">
              프로필 이미지
            </label>
            <div
              className="w-32 h-32 lg:w-40 lg:h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer bg-white hover:bg-gray-50 transition-colors shadow-sm"
              onClick={handleImageClick}
            >
              {profileImagePreview ? (
                <img
                  src={profileImagePreview}
                  alt="프로필 미리보기"
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-center text-gray-500">
                  <div className="text-2xl lg:text-3xl mb-1 lg:mb-2">+</div>
                  <div className="text-xs lg:text-sm">이미지 선택</div>
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
                className="mt-2 lg:mt-3 px-3 lg:px-4 py-1 lg:py-2 bg-gray-500 text-white text-xs lg:text-sm rounded lg:rounded-lg hover:bg-gray-600 transition-colors"
              >
                이미지 삭제
              </button>
            )}
          </div> */}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 lg:mb-3">
              나의 이력 (최대 150자)
            </label>
            <textarea
              placeholder="나의 이력을 입력해주세요..."
              rows={5}
              value={careerText}
              onChange={(e) => setCareerText(e.target.value.slice(0, 150))}
              className="w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-[#2d4739] resize-none bg-white"
            />
            <div className="text-xs lg:text-sm text-gray-500 mt-1 lg:mt-2 text-right">
              {careerText.length}/150
            </div>
          </div>

          <button
            onClick={saveSeller}
            className="w-full px-4 lg:px-6 py-2 lg:py-3 bg-[#2d4739] text-white rounded-lg hover:bg-[#243c30] transition-colors"
          >
            판매자 정보 저장
          </button>
        </div>
      </div>
    );
  }
);

// 판매자 정보 토글 컴포넌트 (자체 상태 관리)
const SellerInfoSection = memo(
  ({
    member,
    initialSellerData,
    onRefresh,
  }: {
    member: Member | null;
    initialSellerData: SellerLegacy | null;
    onRefresh: () => void;
  }) => {
    const [isSellerInfoVisible, setIsSellerInfoVisible] = useState(false);
    const [accountData, setAccountData] = useState({
      bankCode: '',
      account: '',
      accountOwner: '',
      isVerified: false,
    });

    const handleAccountDataChange = useCallback((data: typeof accountData) => {
      setAccountData(data);
    }, []);

    return (
      <section className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 lg:p-8">
        <button
          onClick={() => setIsSellerInfoVisible(!isSellerInfoVisible)}
          className="w-full flex items-center justify-between text-lg lg:text-xl font-bold text-gray-900 hover:text-[#2d4739] transition-colors"
        >
          <span>판매자 정보 확인하기</span>
          <span
            className={`transform transition-transform ${isSellerInfoVisible ? 'rotate-180' : ''}`}
          >
            ↓
          </span>
        </button>

        {isSellerInfoVisible && (
          <div className="mt-6 lg:mt-8 space-y-8">
            <AccountSection
              member={member}
              initialSellerData={initialSellerData}
              onAccountDataChange={handleAccountDataChange}
            />
            <CareerSection
              initialSellerData={initialSellerData}
              accountData={accountData}
              onRefresh={onRefresh}
            />
          </div>
        )}
      </section>
    );
  }
);

/* ======================== Main Component ======================== */
export default function MypageApiSmokeTest() {
  const { storeUrl } = useParams<Params>();
  const legacyStore = useMemo(() => storeUrl ?? 'default', [storeUrl]);

  // ---- 상태 ----
  const [member, setMember] = useState<Member | null>(null);
  const [initialAddress, setInitialAddress] = useState<Address | null>(null);
  const [initialSellerData, setInitialSellerData] = useState<SellerLegacy | null>(null);
  const [loading, setLoading] = useState(false);

  // API 함수들
  const fetchAddressByMemberId = useCallback(async (memberId: number) => {
    try {
      const response = await get<Address>(`/api/info/memberAddress/${memberId}`);
      if (response.status === 200 && response.data) return response.data;
      return null;
    } catch (error) {
      console.error('주소 조회 실패:', error);
      return null;
    }
  }, []);

  const loadAll = useCallback(async () => {
    if (!isLoggedIn()) {
      alert('로그인이 필요합니다.');
      return;
    }
    setLoading(true);
    try {
      // 1) Member (LEGACY)
      const memberEnv = await legacyGet<LegacyEnvelope<Member>>(`/${legacyStore}/mypage`);
      const memberRes = asApi(memberEnv);
      if (memberRes.status !== 200 || !memberRes.data) {
        throw new Error(memberRes.message || '회원 정보 조회 실패');
      }
      const m = memberRes.data;
      setMember(m);

      // 2) Address (Boot)
      const a = await fetchAddressByMemberId(m.memberId);
      setInitialAddress(a);

      // 3) Seller (LEGACY)
      try {
        const env = await legacyGet<LegacyEnvelope<SellerLegacy>>(`/main/sell/info`);
        const res = asApi(env);
        if (res.status === 200 && res.data) {
          setInitialSellerData(res.data);
        } else {
          setInitialSellerData(null);
        }
      } catch {
        setInitialSellerData(null);
      }
    } catch (e: any) {
      alert(e?.message || '조회 중 오류');
    } finally {
      setLoading(false);
    }
  }, [legacyStore, fetchAddressByMemberId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // 컨테이너 컴포넌트
  const Container = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden mb-6 pb-6">
      <div className="bg-gradient-to-r from-[#2d4739] to-gray-800 px-6 md:px-8 py-5 md:py-6">
        <h2 className="text-xl md:text-2xl text-white mb-1.5 md:mb-2">마이 정보 수정</h2>
        <p className="text-gray-200 text-xs md:text-sm">나의 정보를 확인하고 수정하세요</p>
      </div>
      <div className="p-4 md:p-6">{children}</div>
      <div className="px-4 md:px-6 pt-2" />
    </div>
  );

  const isMain = location.pathname.startsWith('/main');

  /* ======================== JSX Return ======================== */
  return (
    <div
      className="min-h-screen font-jua"
      style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)' }}
    >
      <Header />
      {isMain ? <Mainnavbar /> : <Storenavbar />}

      {/* 모바일 상단바 */}
      <div className="lg:hidden">
        <MypageSidenavbar />

        {/* 모바일 컨텐츠 */}
        <div className="px-4">
          <Container>
            <div className="space-y-8">
              <BasicInfoSection member={member} />
              <AddressSection member={member} initialAddress={initialAddress} />
              <PasswordSection />
              <SellerInfoSection
                member={member}
                initialSellerData={initialSellerData}
                onRefresh={loadAll}
              />
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
                <BasicInfoSection member={member} />
                <AddressSection member={member} initialAddress={initialAddress} />
                <PasswordSection />
                <SellerInfoSection
                  member={member}
                  initialSellerData={initialSellerData}
                  onRefresh={loadAll}
                />
              </div>
            </Container>
          </div>
        </MypageSidenavbar>
      </div>
    </div>
  );
}
