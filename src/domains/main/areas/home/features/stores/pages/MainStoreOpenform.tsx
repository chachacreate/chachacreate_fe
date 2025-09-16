// src/domains/main/areas/home/features/stores/pages/MainStoreOpenform.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// import Header from "@src/shared/areas/layout/features/header/Header";
// import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
// 필요하면 StoresSubnavbar도 추가하세요
// import StoresSubnavbar from "@src/shared/areas/navigation/features/subnavbar/stores/StoresSubnavbar";

import { legacyGet, legacyPost } from '@src/libs/request'; // ✅ 레거시 API 유틸
import { goToMain } from '@src/shared/util/LegacyNavigate';
// import { get, post, patch } from "@src/libs/request"; // 부트 API가 필요하면 추가

type CheckState = 'idle' | 'checking' | 'valid' | 'invalid';

const URL_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const MAX_DETAIL_LEN = 3000;

const MainStoreOpenform: React.FC = () => {
  const navigate = useNavigate();

  // ====== Form State ======
  const [storeName, setStoreName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [storeDetail, setStoreDetail] = useState('');
  const [agree, setAgree] = useState(false);

  // ====== URL Check ======
  const [urlState, setUrlState] = useState<CheckState>('idle');
  const [urlMsg, setUrlMsg] = useState<string>('');

  // ====== Logo Upload / Preview ======
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ====== Submit Loading ======
  const [submitting, setSubmitting] = useState(false);

  // ====== Derived ======
  const isUrlFormatOk = useMemo(() => URL_REGEX.test(storeUrl.trim()), [storeUrl]);

  // ====== Handlers ======
  const handleClickUpload = () => fileInputRef.current?.click();

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const allowed = ['jpg', 'jpeg', 'png', 'gif'];
    const ext = f.name.toLowerCase().split('.').pop() || '';
    if (!allowed.includes(ext)) {
      alert('jpg, jpeg, png, gif 형식만 업로드 가능합니다.');
      e.target.value = '';
      return;
    }
    setLogoFile(f);
  };

  // Drag & Drop
  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    const allowed = ['jpg', 'jpeg', 'png', 'gif'];
    const ext = f.name.toLowerCase().split('.').pop() || '';
    if (!allowed.includes(ext)) {
      alert('jpg, jpeg, png, gif 형식만 업로드 가능합니다.');
      return;
    }
    setLogoFile(f);
  };
  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => e.preventDefault();

  // 미리보기 URL 관리
  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(String(ev.target?.result || ''));
    reader.readAsDataURL(logoFile);
  }, [logoFile]);

  // ====== URL Debounced Check (Legacy GET) ======
  useEffect(() => {
    if (!storeUrl) {
      setUrlState('idle');
      setUrlMsg('');
      return;
    }
    if (!isUrlFormatOk) {
      setUrlState('invalid');
      setUrlMsg('❌ 올바른 형식이 아닙니다. (영문/숫자/언더바, 3~20자)');
      return;
    }

    let alive = true;
    setUrlState('checking');
    setUrlMsg('중복 확인 중...');

    const t = setTimeout(async () => {
      try {
        // 🔧 레거시 엔드포인트 경로 확인 필요: '/legacy/main/store/checkurl' 또는 '/main/store/checkurl'
        // 프로젝트의 legacyGet 동작에 맞춰 전체/상대경로를 조정하세요.
        const res = await legacyGet<boolean>(
          `/main/store/checkurl?storeUrl=${encodeURIComponent(storeUrl.trim())}`
        );
        if (!alive) return;

        if (res === true) {
          setUrlState('valid');
          setUrlMsg('✅ 사용 가능한 URL입니다.');
        } else {
          setUrlState('invalid');
          setUrlMsg('❌ 이미 사용 중인 URL입니다.');
        }
      } catch (e) {
        if (!alive) return;
        setUrlState('invalid');
        setUrlMsg('❌ 중복 확인 실패');
      }
    }, 450);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [storeUrl, isUrlFormatOk]);

  // ====== Validate & Submit (Legacy POST multipart) ======
  const handleSubmit = async () => {
    const name = storeName.trim();
    const url = storeUrl.trim();
    const detail = storeDetail.trim();

    if (!name) return alert('스토어 이름을 입력해주세요.');
    if (!logoFile) return alert('스토어 로고 이미지를 업로드해주세요.');
    if (!url) return alert('스토어 URL을 입력해주세요.');
    if (!isUrlFormatOk || urlState !== 'valid') {
      return alert('사용 가능한 스토어 URL을 입력해주세요.');
    }
    if (!detail) return alert('스토어 설명을 입력해주세요.');
    if (!agree) return alert('개인정보 수집 및 이용에 동의해 주세요.');

    const formData = new FormData();
    formData.append('storeName', name);
    formData.append('storeUrl', url);
    formData.append('storeDetail', detail);
    formData.append('logoImg', logoFile);

    try {
      setSubmitting(true);
      // 🔧 레거시 엔드포인트 경로 확인 필요: '/legacy/main/store/openform' 또는 '/main/store/openform'
      // legacyPost가 자동으로 multipart 헤더 설정을 해 주지 않는다면 headers 옵션을 추가할 수 있습니다.
      const response = await legacyPost<any>(`/main/store/openform`, formData);
      console.log(response);
      // 레거시의 응답 형식에 따라 아래 로직 조정하세요.
      // 만약 { status:200, data:{ accessToken } } 형태면:
      if (response?.status && response.status !== 200) {
        goToMain();
        return alert('스토어 신청에 실패했습니다. 다시 시도해 주세요.');
      }
      const accessToken = response?.data;
      localStorage.removeItem('accessToken');
      console.log('accessToken:', accessToken);
      if (accessToken) {
        console.log('New accessToken:', accessToken);
        localStorage.setItem('accessToken', accessToken);
        console.log(localStorage.getItem('accessToken') + '성공!');
        alert('스토어 신청이 완료되었습니다.');
      }
      // 스토어 메인으로 이동
      navigate(`/main/stores`);
    } catch (err: any) {
      console.error('[openform] error:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ====== UI ======
  return (
    <div className="min-h-screen font-jua bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      {/* <Header />
      <Mainnavbar /> */}
      {/* <StoresSubnavbar /> */}

      {/* 1920 기준 좌우 240, 내부 1440 컨테이너 */}
      <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10">
        <section className="max-w-[1440px] mx-auto py-8 md:py-12">
          {/* 상단 배너 */}
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg mb-8">
            <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_20%_20%,#e6f4ea,transparent_40%),radial-gradient(circle_at_80%_0%,#f3f8ff,transparent_45%),radial-gradient(circle_at_60%_80%,#fef6e4,transparent_35%)]" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 px-6 md:px-10 py-8">
              <img
                src="/resources/images/logo.png"
                alt="logo"
                className="w-16 h-16 object-contain"
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
              />
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">스토어 개설 신청</h1>
                <p className="text-gray-600 mt-1">
                  나만의 스토어를 오픈해 보세요. 로고와 URL을 설정하고 간단한 소개만 작성하면 시작할
                  수 있어요.
                </p>
              </div>
              <img
                src="/resources/images/illustration.png"
                alt="illustration"
                className="hidden md:block w-40 h-24 object-contain opacity-90"
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
              />
            </div>
          </div>

          {/* 폼 카드 */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-5 sm:px-8 py-6 sm:py-8">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
                스토어 개설 신청하기
              </h2>

              {/* 스토어 이름 */}
              <div className="mb-6">
                <div className="flex items-center gap-1 mb-2">
                  <label className="text-sm font-semibold text-gray-800">스토어 이름</label>
                  <span className="text-red-500">*</span>
                </div>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="스토어 이름을 입력하세요"
                  className="w-full rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent px-4 py-3 text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {/* 스토어 대표사진(로고) */}
              <div className="mb-6">
                <div className="flex items-center gap-1 mb-2">
                  <label className="text-sm font-semibold text-gray-800">
                    스토어 대표사진(로고)
                  </label>
                  <span className="text-red-500">*</span>
                </div>

                <div
                  onClick={handleClickUpload}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="group h-48 sm:h-56 rounded-xl border-2 border-dashed border-gray-300 hover:border-emerald-400 bg-gray-50 flex items-center justify-center cursor-pointer relative overflow-hidden"
                  title="클릭 또는 드래그하여 업로드"
                >
                  {!logoPreview ? (
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <div className="text-4xl leading-none mb-2">＋</div>
                      <p className="text-sm">클릭 또는 드래그하여 로고 이미지를 업로드</p>
                      <p className="text-xs text-gray-400 mt-1">허용 확장자: jpg, jpeg, png, gif</p>
                    </div>
                  ) : (
                    <>
                      <img
                        src={logoPreview}
                        alt="logo preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur px-2 py-1 text-xs rounded-md">
                        변경하려면 클릭
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* 스토어 URL */}
              <div className="mb-6">
                <div className="flex items-center gap-1 mb-2">
                  <label className="text-sm font-semibold text-gray-800">스토어 URL</label>
                  <span className="text-red-500">*</span>
                </div>

                <input
                  type="text"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="영문, 숫자, 언더바(_)만 사용 가능 (3~20자)"
                  className="w-full rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent px-4 py-3 text-gray-900 placeholder:text-gray-400"
                />
                <div
                  className={`mt-1 text-xs ${
                    urlState === 'valid'
                      ? 'text-emerald-600'
                      : urlState === 'invalid'
                        ? 'text-red-600'
                        : 'text-gray-500'
                  }`}
                >
                  {urlMsg}
                </div>
              </div>

              {/* 스토어 설명 */}
              <div className="mb-6">
                <div className="flex items-center gap-1 mb-2">
                  <label className="text-sm font-semibold text-gray-800">스토어 설명</label>
                  <span className="text-red-500">*</span>
                </div>

                <div className="relative">
                  <textarea
                    value={storeDetail}
                    onChange={(e) =>
                      setStoreDetail(
                        e.target.value.length > MAX_DETAIL_LEN
                          ? e.target.value.slice(0, MAX_DETAIL_LEN)
                          : e.target.value
                      )
                    }
                    placeholder="스토어를 소개해 주세요 (최대 3000자)"
                    rows={7}
                    className="w-full rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent px-4 py-3 text-gray-900 placeholder:text-gray-400"
                  />
                  <div className="absolute right-2 bottom-2 text-xs text-gray-500">
                    {storeDetail.length}/{MAX_DETAIL_LEN}
                  </div>
                </div>
              </div>

              {/* 동의 */}
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">
                    정보를 수집·이용하는 데 동의합니다.
                  </span>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-xs underline text-gray-500"
                    title="자세히 보기"
                  >
                    자세히
                  </a>
                  <span className="text-red-500">*</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">2년 이내 정보는 파기됩니다.</div>

                <label className="mt-3 inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-400"
                  />
                  <span className="text-sm text-gray-800">동의합니다.</span>
                </label>
              </div>

              {/* 버튼 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    !storeName.trim() ||
                    !logoFile ||
                    !storeUrl.trim() ||
                    !isUrlFormatOk ||
                    urlState !== 'valid' ||
                    !storeDetail.trim() ||
                    !agree
                  }
                  className="w-full md:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold
                    bg-emerald-600 text-white shadow hover:bg-emerald-700 active:scale-[0.99] transition
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '신청 중...' : '신청하기'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MainStoreOpenform;
