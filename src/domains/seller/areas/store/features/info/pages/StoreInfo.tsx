import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';
import { Camera, Save, Check } from 'lucide-react';
import { legacyGet, legacyPost } from '@src/libs/request';

// ------------------ Types ------------------
interface StoreInfo {
  logo: string;
  name: string;
  description: string;
  originalLogo: string;
}

interface SellerInfo {
  name: string;
  phone: string;
  email: string;
}

interface AccountInfo {
  holderName: string;
  bank: string;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  isVerified: boolean;
  isEditable: boolean;
  originalBankCode: string;
  originalAccountNumber: string;
}

interface ProfileInfo {
  resume: string;
}

interface SellerInfoResponse {
  status: number;
  message: string;
  data: {
    logoImg: string;
    storeName: string;
    storeDetail: string;
    memberName: string;
    memberEmail: string;
    memberPhone: string;
    account: string;
    accountBank: string;
    profileInfo: string;
  };
}

interface BankResponse {
  bankHolderInfo?: string;
}

// ------------------ Constants ------------------
const BANK_OPTIONS = [
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

// ------------------ Component ------------------
export default function SellerStoreInfo() {
  const { storeUrl = 'store' } = useParams();

  // States
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    logo: '/api/placeholder/200/200',
    name: '',
    description: '',
    originalLogo: '',
  });

  const [sellerInfo, setSellerInfo] = useState<SellerInfo>({
    name: '',
    phone: '',
    email: '',
  });

  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    holderName: '',
    bank: '',
    bankCode: '',
    accountNumber: '',
    accountHolder: '',
    isVerified: false,
    isEditable: true,
    originalBankCode: '',
    originalAccountNumber: '',
  });

  const [profileInfo, setProfileInfo] = useState<ProfileInfo>({
    resume: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState('');
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(false);

  // Refs
  const logoFileRef = useRef<HTMLInputElement>(null);

  // Load seller info on component mount
  useEffect(() => {
    loadSellerInfo();
  }, [storeUrl]);

  // Load seller information from API
  const loadSellerInfo = async () => {
    try {
      setIsDataLoading(true);
      const response = await legacyGet<SellerInfoResponse>(
        `/${storeUrl}/seller/management/sellerInfo`
      );

      if (response.status === 200) {
        const data = response.data;

        // Update store info
        const logoPath = data.logoImg
          ? data.logoImg.startsWith('http')
            ? data.logoImg
            : `/${data.logoImg}`
          : '/api/placeholder/200/200';

        setStoreInfo({
          logo: logoPath,
          name: data.storeName || '',
          description: data.storeDetail || '',
          originalLogo: data.logoImg || '',
        });

        // Update seller info
        setSellerInfo({
          name: data.memberName || '',
          phone: data.memberPhone || '',
          email: data.memberEmail || '',
        });

        // Update account info - 항상 편집 가능하도록 설정
        const bankOption = BANK_OPTIONS.find((bank) => bank.name === data.accountBank);
        const hasExistingAccount = !!(data.account && data.accountBank);

        setAccountInfo({
          holderName: data.memberName || '',
          bank: data.accountBank || '',
          bankCode: hasExistingAccount ? '' : bankOption?.code || '', // 기존 계좌가 있으면 빈 값으로 시작
          accountNumber: hasExistingAccount ? '' : data.account || '', // 기존 계좌가 있으면 빈 값으로 시작
          accountHolder: '',
          isVerified: false, // 처음엔 항상 미인증 상태
          isEditable: true, // 항상 편집 가능
          originalBankCode: bankOption?.code || '',
          originalAccountNumber: data.account || '',
        });

        // Update profile info
        setProfileInfo({
          resume: data.profileInfo || '',
        });
      }
    } catch (error) {
      console.error('Failed to load seller info:', error);
      alert('판매자 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsDataLoading(false);
    }
  };

  // Verify bank account
  const verifyBankAccount = async () => {
    if (!accountInfo.bankCode || !accountInfo.accountNumber) {
      alert('은행과 계좌번호를 모두 입력해주세요.');
      return;
    }

    try {
      setIsVerifyingAccount(true);
      const response = await legacyGet<BankResponse>('/common/bank', {
        bank_code: accountInfo.bankCode,
        bank_num: accountInfo.accountNumber,
      });

      if (response.bankHolderInfo) {
        const bankHolderName = response.bankHolderInfo;

        if (bankHolderName === accountInfo.holderName) {
          setAccountInfo((prev) => ({
            ...prev,
            accountHolder: bankHolderName,
            isVerified: true,
          }));
          alert('계좌 인증이 완료되었습니다.');
        } else {
          setAccountInfo((prev) => ({
            ...prev,
            accountHolder: bankHolderName,
            isVerified: false,
          }));
          alert('예금주명이 로그인 사용자와 다릅니다.');
        }
      } else {
        alert('예금주 정보를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('Bank verification failed:', error);
      alert('예금주 조회 중 오류가 발생했습니다.');
    } finally {
      setIsVerifyingAccount(false);
    }
  };

  // Validate inputs
  const validateInputs = (): boolean => {
    if (!storeInfo.description.trim()) {
      alert('스토어 소개를 입력해주세요.');
      return false;
    }

    // 계좌 정보는 기존 값 또는 새로운 값이 있어야 함
    const finalBankCode = accountInfo.bankCode || accountInfo.originalBankCode;
    const finalAccountNumber = accountInfo.accountNumber || accountInfo.originalAccountNumber;

    if (!finalBankCode) {
      alert('은행을 선택해주세요.');
      return false;
    }

    if (!finalAccountNumber.trim()) {
      alert('계좌번호를 입력해주세요.');
      return false;
    }

    // 새로운 계좌 정보를 입력했다면 인증이 필요
    if (accountInfo.bankCode || accountInfo.accountNumber) {
      if (!accountInfo.isVerified) {
        alert('계좌 정보의 인증을 먼저 완료해주세요.');
        return false;
      }
    }

    if (!profileInfo.resume.trim()) {
      alert('이력 설명을 입력해주세요.');
      return false;
    }

    return true;
  };

  // Handle logo change
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // File size check (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하로 선택해주세요.');
        return;
      }

      // File type check
      const allowedTypes = ['jpg', 'jpeg', 'png', 'gif'];
      const fileExtension = file.name.toLowerCase().split('.').pop();
      if (!fileExtension || !allowedTypes.includes(fileExtension)) {
        alert('jpg, jpeg, png, gif 형식의 이미지 파일만 선택할 수 있습니다.');
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setStoreInfo((prev) => ({
          ...prev,
          logo: e.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle bank change
  const handleBankChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBank = BANK_OPTIONS.find((bank) => bank.code === event.target.value);
    setAccountInfo((prev) => ({
      ...prev,
      bankCode: event.target.value,
      bank: selectedBank?.name || '',
      isVerified: false,
      accountHolder: '',
    }));
  };

  // Handle account number change
  const handleAccountNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAccountInfo((prev) => ({
      ...prev,
      accountNumber: event.target.value,
      isVerified: false,
      accountHolder: '',
    }));
  };

  // Handle save
  const handleSave = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      // 입력된 값이 없으면 기존 값 사용
      const finalBankCode = accountInfo.bankCode || accountInfo.originalBankCode;
      const finalAccountNumber = accountInfo.accountNumber || accountInfo.originalAccountNumber;
      const finalBankName =
        BANK_OPTIONS.find((bank) => bank.code === finalBankCode)?.name || accountInfo.bank;

      // FormData 생성하여 multipart/form-data로 전송
      const formData = new FormData();

      // 텍스트 데이터 추가
      formData.append('storeDetail', storeInfo.description);
      formData.append('account', finalAccountNumber);
      formData.append('accountBank', finalBankName);
      formData.append('profileInfo', profileInfo.resume);

      // 로고 파일 처리
      const logoFile = logoFileRef.current?.files?.[0];
      if (logoFile) {
        formData.append('logoImg', logoFile);
      } else if (storeInfo.originalLogo) {
        formData.append('existingLogoImg', storeInfo.originalLogo);
      }

      const response = await legacyPost<SellerInfoResponse>(
        `/${storeUrl}/seller/management/sellerInfo`,
        formData
      );

      if (response.status === 200) {
        setSavedMessage('정보가 성공적으로 수정되었습니다.');
        setTimeout(() => setSavedMessage(''), 3000);
        // 성공 후 데이터 다시 로드
        await loadSellerInfo();
      } else {
        alert('수정 실패: ' + response.message);
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('서버 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isDataLoading) {
    return (
      <>
        <Header />
        <SellerSidenavbar>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-[#2d4739] rounded-full animate-spin" />
            </div>
          </div>
        </SellerSidenavbar>
      </>
    );
  }

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

            <button
              onClick={handleSave}
              disabled={isLoading}
              className={[
                'flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors',
                isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#2d4739] text-white hover:bg-[#1f3027]',
              ].join(' ')}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  수정하기
                </>
              )}
            </button>
          </div>

          {/* Success Message */}
          {savedMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700">
              <Check className="w-5 h-5" />
              {savedMessage}
            </div>
          )}

          <div className="space-y-8">
            {/* 1. 나의 스토어 정보 */}
            <section className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">나의 스토어 정보</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 스토어 로고 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    스토어 로고
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <img
                        src={storeInfo.logo}
                        alt="스토어 로고"
                        className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200"
                      />
                      <button
                        onClick={() => logoFileRef.current?.click()}
                        className="absolute inset-0 bg-black bg-opacity-50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Camera className="w-5 h-5 text-white" />
                      </button>
                    </div>
                    <div>
                      <button
                        onClick={() => logoFileRef.current?.click()}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                      >
                        사진 수정
                      </button>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG 파일 (최대 5MB)</p>
                      {storeInfo.originalLogo && (
                        <p className="text-xs text-blue-600 mt-1">
                          이미지를 선택하지 않으면 기존 이미지가 유지됩니다.
                        </p>
                      )}
                    </div>
                  </div>
                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>

                {/* 스토어 명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">스토어 명</label>
                  <input
                    type="text"
                    value={storeInfo.name}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                    placeholder="스토어 이름"
                  />
                  <p className="text-xs text-gray-500 mt-1">스토어 명은 수정할 수 없습니다.</p>
                </div>
              </div>
            </section>

            {/* 2. 내 스토어 정보 */}
            <section className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">내 스토어 정보</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  스토어 소개 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={storeInfo.description}
                  onChange={(e) =>
                    setStoreInfo((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-transparent resize-none"
                  placeholder="스토어를 소개해주세요"
                />
                <p className="text-xs text-gray-500 mt-1">고객들에게 보여질 스토어 소개글입니다.</p>
              </div>
            </section>

            {/* 3. 판매자 정보 */}
            <section className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">판매자 정보</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                  <input
                    type="text"
                    value={sellerInfo.name}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">연락처</label>
                  <input
                    type="text"
                    value={sellerInfo.phone}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                  <input
                    type="email"
                    value={sellerInfo.email}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
              </div>
            </section>

            {/* 4. 계좌 정보 */}
            <section className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">계좌 정보</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">예금주명</label>
                  <input
                    type="text"
                    value={accountInfo.holderName}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    은행명 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={accountInfo.bankCode}
                    onChange={handleBankChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-transparent"
                  >
                    <option value="">
                      {accountInfo.originalBankCode
                        ? `${BANK_OPTIONS.find((bank) => bank.code === accountInfo.originalBankCode)?.name || ''}`
                        : '은행선택'}
                    </option>
                    {BANK_OPTIONS.map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    계좌번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountInfo.accountNumber}
                    onChange={handleAccountNumberChange}
                    placeholder={
                      accountInfo.originalAccountNumber
                        ? `${accountInfo.originalAccountNumber}`
                        : '-없이 계좌번호 입력'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">예금주</label>
                  <input
                    type="text"
                    value={accountInfo.accountHolder}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                {(accountInfo.bankCode || accountInfo.accountNumber) && (
                  <button
                    onClick={verifyBankAccount}
                    disabled={isVerifyingAccount}
                    className={[
                      'px-4 py-2 rounded-lg font-medium transition-colors',
                      isVerifyingAccount
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#2d4739] text-white hover:bg-[#1f3027]',
                    ].join(' ')}
                  >
                    {isVerifyingAccount ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin inline-block mr-2" />
                        인증 중...
                      </>
                    ) : (
                      '계좌 인증하기'
                    )}
                  </button>
                )}

                {accountInfo.isVerified && (
                  <div className="flex items-center gap-4">
                    <button
                      disabled
                      className="px-4 py-2 rounded-lg font-medium bg-emerald-100 text-emerald-700 border border-emerald-200"
                    >
                      <Check className="w-4 h-4 inline-block mr-2" />
                      인증 완료
                    </button>
                    <p className="text-sm text-emerald-600 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      계좌 인증이 완료되었습니다.
                    </p>
                  </div>
                )}

                {!accountInfo.bankCode &&
                  !accountInfo.accountNumber &&
                  accountInfo.originalBankCode && (
                    <p className="text-sm text-blue-600">
                      새로운 계좌 정보를 입력하지 않으면 기존 정보가 유지됩니다.
                    </p>
                  )}
              </div>
            </section>

            {/* 5. 나의 이력 등록 */}
            <section className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">나의 이력 등록</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이력 소개 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={profileInfo.resume}
                  onChange={(e) => setProfileInfo((prev) => ({ ...prev, resume: e.target.value }))}
                  rows={8}
                  maxLength={150}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-transparent resize-none"
                  placeholder="본인의 경력과 이력을 소개해주세요 (최대 150자)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  고객들에게 보여질 작가 이력입니다. ({profileInfo.resume.length}/150자)
                </p>
              </div>
            </section>
          </div>
        </div>
      </SellerSidenavbar>
    </>
  );
}
