import { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellerSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar";
import { Camera, Upload, Save, X, Check, AlertCircle } from "lucide-react";

// ------------------ Types ------------------
interface StoreInfo {
  logo: string;
  name: string;
  description: string;
}

interface SellerInfo {
  name: string;
  phone: string;
  email: string;
}

interface AccountInfo {
  holderName: string;
  bank: string;
  accountNumber: string;
  accountHolder: string;
}

interface ProfileInfo {
  resume: string;
  resumeFile: File | null;
  resumeFileName: string;
}

// ------------------ MOCK DATA ------------------
const INITIAL_STORE_INFO: StoreInfo = {
  logo: "/api/placeholder/200/200",
  name: "창작공방 아틀리에",
  description: "핸드메이드 도자기와 드라이플라워로 특별한 순간을 만들어가는 공간입니다. 정성스럽게 만든 작품들로 여러분의 일상에 따뜻함을 더해드리겠습니다."
};

const INITIAL_SELLER_INFO: SellerInfo = {
  name: "김아티",
  phone: "010-1234-5678",
  email: "artist@example.com"
};

const INITIAL_ACCOUNT_INFO: AccountInfo = {
  holderName: "김아티",
  bank: "우리은행",
  accountNumber: "1002-858-069-478",
  accountHolder: "김아티"
};

const INITIAL_PROFILE_INFO: ProfileInfo = {
  resume: "안녕하세요, 도자기 공방을 운영하고 있는 김아티입니다.\n\n- 홍익대학교 도예학과 졸업\n- 개인전 5회 개최\n- 도자기 공방 운영 10년차\n- 핸드메이드 작품 제작 및 원데이 클래스 진행\n\n정성스럽게 만든 작품으로 고객님들께 특별한 경험을 선사하겠습니다.",
  resumeFile: null,
  resumeFileName: "profile_resume.pdf"
};

const BANK_OPTIONS = [
  "우리은행", "신한은행", "국민은행", "하나은행", "농협은행", 
  "카카오뱅크", "토스뱅크", "케이뱅크", "SC제일은행", "씨티은행"
];

// ------------------ Component ------------------
export default function SellerStoreInfo() {
  const { storeUrl = "store" } = useParams();
  
  // States
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(INITIAL_STORE_INFO);
  const [sellerInfo, setSellerInfo] = useState<SellerInfo>(INITIAL_SELLER_INFO);
  const [accountInfo, setAccountInfo] = useState<AccountInfo>(INITIAL_ACCOUNT_INFO);
  const [profileInfo, setProfileInfo] = useState<ProfileInfo>(INITIAL_PROFILE_INFO);
  const [isLoading, setIsLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  // Refs
  const logoFileRef = useRef<HTMLInputElement>(null);
  const resumeFileRef = useRef<HTMLInputElement>(null);

  // Handlers
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 파일 크기 체크 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("파일 크기는 5MB 이하로 선택해주세요.");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setStoreInfo(prev => ({
          ...prev,
          logo: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResumeFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 파일 크기 체크 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("파일 크기는 10MB 이하로 선택해주세요.");
        return;
      }
      
      setProfileInfo(prev => ({
        ...prev,
        resumeFile: file,
        resumeFileName: file.name
      }));
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 실제로는 FormData로 전송
      const formData = new FormData();
      formData.append('storeName', storeInfo.name);
      formData.append('storeDescription', storeInfo.description);
      formData.append('sellerName', sellerInfo.name);
      formData.append('sellerPhone', sellerInfo.phone);
      formData.append('sellerEmail', sellerInfo.email);
      formData.append('accountHolderName', accountInfo.holderName);
      formData.append('accountBank', accountInfo.bank);
      formData.append('accountNumber', accountInfo.accountNumber);
      formData.append('accountHolder', accountInfo.accountHolder);
      formData.append('resume', profileInfo.resume);
      
      if (profileInfo.resumeFile) {
        formData.append('resumeFile', profileInfo.resumeFile);
      }
      
      setSavedMessage("스토어 정보가 성공적으로 저장되었습니다.");
      setTimeout(() => setSavedMessage(""), 3000);
      
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeResumeFile = () => {
    setProfileInfo(prev => ({
      ...prev,
      resumeFile: null,
      resumeFileName: ""
    }));
    if (resumeFileRef.current) {
      resumeFileRef.current.value = "";
    }
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
            
            <button
              onClick={handleSave}
              disabled={isLoading}
              className={[
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors",
                isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-[#2d4739] text-white hover:bg-[#1f3027]"
              ].join(" ")}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  저장하기
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
                        이미지 변경
                      </button>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG 파일 (최대 5MB)
                      </p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    스토어 명
                  </label>
                  <input
                    type="text"
                    value={storeInfo.name}
                    onChange={(e) => setStoreInfo(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-transparent"
                    placeholder="스토어 이름을 입력하세요"
                  />
                </div>
              </div>
            </section>

            {/* 2. 내 스토어 정보 */}
            <section className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">내 스토어 정보</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  스토어 소개
                </label>
                <textarea
                  value={storeInfo.description}
                  onChange={(e) => setStoreInfo(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-transparent resize-none"
                  placeholder="스토어를 소개해주세요"
                />
                <p className="text-xs text-gray-500 mt-1">
                  고객들에게 보여질 스토어 소개글입니다.
                </p>
              </div>
            </section>

            {/* 3. 판매자 정보 */}
            <section className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">판매자 정보</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이름
                  </label>
                  <input
                    type="text"
                    value={sellerInfo.name}
                    onChange={(e) => setSellerInfo(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-transparent"
                    placeholder="이름을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    연락처
                  </label>
                  <input
                    type="text"
                    value={sellerInfo.phone}
                    onChange={(e) => setSellerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-transparent"
                    placeholder="연락처를 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={sellerInfo.email}
                    onChange={(e) => setSellerInfo(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-transparent"
                    placeholder="이메일을 입력하세요"
                  />
                </div>
              </div>
            </section>

            {/* 4. 계좌 정보 */}
            <section className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">계좌 정보</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    예금주명
                  </label>
                  <input
                    type="text"
                    value={accountInfo.holderName}
                    onChange={(e) => setAccountInfo(prev => ({ ...prev, holderName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-transparent"
                    placeholder="예금주명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    은행명 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={accountInfo.bank}
                    onChange={(e) => setAccountInfo(prev => ({ ...prev, bank: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-transparent"
                  >
                    {BANK_OPTIONS.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
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
                    onChange={(e) => setAccountInfo(prev => ({ ...prev, accountNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-transparent"
                    placeholder="계좌번호를 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    계좌주
                  </label>
                  <input
                    type="text"
                    value={accountInfo.accountHolder}
                    onChange={(e) => setAccountInfo(prev => ({ ...prev, accountHolder: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-transparent"
                    placeholder="계좌주를 입력하세요"
                  />
                </div>
              </div>
            </section>

            {/* 5. 나의 이력 등록 */}
            <section className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">나의 이력 등록</h2>
              
              <div className="space-y-4">
                {/* 파일 업로드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이력서 파일
                  </label>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => resumeFileRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      파일 선택
                    </button>
                    
                    {profileInfo.resumeFile ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-sm text-green-700">{profileInfo.resumeFile.name}</span>
                        <button
                          onClick={removeResumeFile}
                          className="text-green-700 hover:text-green-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : profileInfo.resumeFileName && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="text-sm text-blue-700">기존: {profileInfo.resumeFileName}</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, DOC, DOCX 파일 (최대 10MB)
                  </p>
                  
                  <input
                    ref={resumeFileRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeFileChange}
                    className="hidden"
                  />
                </div>

                {/* 이력 텍스트 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이력 소개
                  </label>
                  <textarea
                    value={profileInfo.resume}
                    onChange={(e) => setProfileInfo(prev => ({ ...prev, resume: e.target.value }))}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4739] focus:border-transparent resize-none"
                    placeholder="본인의 경력과 이력을 소개해주세요"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    고객들에게 보여질 작가 이력입니다.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </SellerSidenavbar>
    </>
  );
}