import { useState, useEffect, useRef } from 'react';
import Header from '@src/shared/areas/layout/features/header/Header';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';
import { useParams } from 'react-router-dom';
import { get, post } from '@src/libs/request';

type ClassOptionResponseDTO = {
  id: number;
  name: string;
};

type ResumeResponseDTO = {
  resumeId: number;
  status: string;
  images: { id: number; url: string; content: string }[];
};

export default function ResumeVerification() {
  const { storeUrl } = useParams();

  // 스토어 이름(API로 주입)
  const [storeName, setStoreName] = useState('');

  // 설명/파일/미리보기 (인덱스 매칭)
  const [descriptions, setDescriptions] = useState<string[]>(['']); // 초기 1개
  const [files, setFiles] = useState<(File | null)[]>([null]);
  const [previews, setPreviews] = useState<(string | null)[]>([null]); // objectURL 저장
  const maxDescriptions = 5;

  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    marketing: false,
  });

  const [openCards, setOpenCards] = useState({
    terms: false,
    privacy: false,
    marketing: false,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentIndexForFile, setCurrentIndexForFile] = useState<number>(0);

  // ----- helpers -----
  const revokeUrl = (url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  };

  // 접속 시 스토어 이름 불러오기
  useEffect(() => {
    const fetchPrefill = async () => {
      if (!storeUrl) return;
      try {
        const res = await get<ClassOptionResponseDTO>(`/api/seller/${storeUrl}/resumes/prefill`);
        setStoreName(res.data.name);
      } catch {
        setStoreName('스토어 불러오기 실패');
      }
    };
    fetchPrefill();
  }, [storeUrl]);

  // 언마운트/갱신 시 기존 objectURL 정리
  useEffect(() => {
    return () => {
      previews.forEach(revokeUrl);
    };
  }, [previews]);

  const handleDescriptionChange = (index: number, value: string) => {
    const next = [...descriptions];
    next[index] = value.slice(0, 150);
    setDescriptions(next);
  };

  const addDescription = () => {
    if (descriptions.length < maxDescriptions) {
      setDescriptions((prev) => [...prev, '']);
      setFiles((prev) => [...prev, null]);
      setPreviews((prev) => [...prev, null]);
    }
  };

  const removeDescription = (index: number) => {
    // 미리보기 URL 해제
    revokeUrl(previews[index]);

    setDescriptions((prev) => prev.filter((_, i) => i !== index));
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAgreement = (key: keyof typeof agreements) => {
    const updated = { ...agreements, [key]: !agreements[key] };
    const allChecked = updated.terms && updated.privacy && updated.marketing;
    updated.all = allChecked;
    setAgreements(updated);
  };

  const toggleAll = () => {
    const newValue = !agreements.all;
    setAgreements({
      all: newValue,
      terms: newValue,
      privacy: newValue,
      marketing: newValue,
    });
  };

  const toggleCard = (key: keyof typeof openCards) => {
    setOpenCards({ ...openCards, [key]: !openCards[key] });
  };

  const onClickFileBox = (idx: number) => {
    setCurrentIndexForFile(idx);
    fileInputRef.current?.click();
  };

  const onChangeHiddenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;

    // 파일 상태 반영
    setFiles((prev) => {
      const next = [...prev];
      next[currentIndexForFile] = f;
      return next;
    });

    // 미리보기 URL 생성/교체 (기존 URL 해제)
    setPreviews((prev) => {
      const next = [...prev];
      // 기존 objectURL 정리
      revokeUrl(next[currentIndexForFile]);
      next[currentIndexForFile] = f ? URL.createObjectURL(f) : null;
      return next;
    });

    // 같은 파일 다시 선택할 수 있게 초기화
    e.currentTarget.value = '';
  };

  const handleSubmit = async () => {
    if (!(agreements.terms && agreements.privacy)) {
      alert('필수 약관에 동의해야 신청할 수 있습니다.');
      return;
    }
    const hasAnyFile = files.some((f) => !!f);
    if (!hasAnyFile) {
      alert('최소 1장 이상의 이미지를 선택해주세요.');
      return;
    }
    if (!storeUrl) {
      alert('스토어 URL이 유효하지 않습니다.');
      return;
    }

    try {
      const formData = new FormData();

      // 파일이 있는 항목만 전송(images[*].file / images[*].content)
      let idx = 0;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (!f) continue;
        formData.append(`images[${idx}].file`, f);
        formData.append(`images[${idx}].content`, descriptions[i] ?? '');
        idx++;
      }

      const res = await post<ResumeResponseDTO>(`/api/seller/${storeUrl}/resumes`, formData);

      alert('이력서 등록 완료!');
      // console.log('등록 응답:', res.data);

      // 미리보기 URL 전부 해제 후 초기화
      previews.forEach(revokeUrl);
      setDescriptions(['']);
      setFiles([null]);
      setPreviews([null]);
      setAgreements({ all: false, terms: false, privacy: false, marketing: false });
      setOpenCards({ terms: false, privacy: false, marketing: false });
    } catch (err) {
      console.error('이력서 등록 실패:', err);
      alert('이력서 등록 중 오류가 발생했습니다.');
    }
  };

  const isSubmitEnabled = agreements.terms && agreements.privacy;

  return (
    <>
      <Header />
      <SellerSidenavbar>
        <h1 className="text-xl font-bold text-center mt-4 mb-6">클래스 개설 신청서</h1>
        <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-lg space-y-8 border border-gray-200">
          {/* 스토어 이름 */}
          <div>
            <label className="block font-semibold text-lg">스토어 이름</label>
            <input
              type="text"
              value={storeName}
              disabled
              className="w-full border rounded-md mt-2 px-3 py-2 bg-gray-100 text-gray-700"
            />
          </div>

          {/* 안내 텍스트 */}
          <div className="mb-1">
            <label className="block font-semibold text-xl">나의 이력 등록하기</label>
            <label className="text-sm text-gray-500">
              나의 이력을 등록해주세요. 판매자님의 입력을 확인하고 검증합니다.
            </label>
          </div>

          {/* 클래스 설명 (동적 추가/삭제 가능) */}
          <div className="space-y-4">
            {descriptions.map((desc, idx) => (
              <div key={idx} className="flex gap-4 items-stretch">
                {/* 파일 선택 박스(플러스 박스) */}
                <div
                  className="w-32 h-32 flex-shrink-0 border rounded-lg bg-gray-100 flex items-center justify-center cursor-pointer overflow-hidden hover:bg-gray-200"
                  onClick={() => onClickFileBox(idx)}
                  title="이미지 선택"
                >
                  {previews[idx] ? (
                    <img
                      src={previews[idx] as string}
                      alt={`선택한 이미지 ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-gray-400">+</span>
                  )}
                </div>

                <div className="flex-1 flex flex-col">
                  <textarea
                    placeholder={`내용을 입력하세요 (${idx + 1}번째)`}
                    value={desc}
                    onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                    className="flex-1 border rounded-lg p-5 resize-none h-32 text-sm"
                  />
                  {descriptions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDescription(idx)}
                      className="text-red-500 text-sm mt-1 self-end"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))}

            {descriptions.length < maxDescriptions && (
              <button
                type="button"
                onClick={addDescription}
                className="text-sm text-[#2D4739] hover:underline"
              >
                + 추가
              </button>
            )}
          </div>

          {/* 약관 동의 */}
          <div className="p-4 rounded-md text-sm space-y-3">
            {/* 전체 동의 */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreements.all}
                onChange={toggleAll}
                className="mt-1 accent-[#2D4739]"
              />
              <div>
                <div className="font-medium">모두 동의합니다</div>
                <div className="text-gray-600">
                  이용약관, 개인정보 수집·이용, 마케팅 정보 수신 동의를 포함합니다.
                </div>
              </div>
            </label>

            <hr className="border-gray-300" />

            {/* 약관 카드들 */}
            {[
              {
                key: 'terms',
                label: '이용 약관 동의',
                required: true,
                content:
                  '제1조(목적) 이 약관은 회사가 제공하는 서비스의 이용조건 및 절차에 관한 사항을 규정합니다.\n제2조(정의) "회원"은 사이트에 개인정보를 제공하여 가입한 자를 말합니다.\n제3조(약관의 효력 및 변경) 이 약관은 사이트에 게시함으로써 효력을 발생하며, 변경 시 별도 고지 후 적용됩니다.',
              },
              {
                key: 'privacy',
                label: '개인정보 수집·이용 동의',
                required: true,
                content:
                  '수집 항목: 이력 인증용 사진, 부가 설명(선택)\n' +
                  '이용 목적: 클래스 개설 신청 검증, 스토어 클래스 관리, 민원 처리 등\n' +
                  '보유 기간: 클래스 개설 과정 종료 후 파기 또는 관련 법령 기준에 따름',
              },
              {
                key: 'marketing',
                label: '마케팅 정보 수신 동의',
                required: false,
                content: '이벤트, 쿠폰, 뉴스레터 등 마케팅 정보를 이메일 또는 문자로 수신합니다.',
              },
            ].map((term) => (
              <div key={term.key} className="border rounded-md p-3">
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => toggleCard(term.key as keyof typeof openCards)}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={agreements[term.key as keyof typeof agreements]}
                      onChange={() => toggleAgreement(term.key as keyof typeof agreements)}
                      className="accent-[#2D4739]"
                    />
                    <span className="font-medium text-gray-800">
                      {term.label}{' '}
                      {term.required ? (
                        <span className="text-red-500">(필수)</span>
                      ) : (
                        <span className="text-gray-500">(선택)</span>
                      )}
                    </span>
                  </div>

                  {/* 화살표 세모 */}
                  <div
                    className={`w-3 h-3 border-r-2 border-b-2 border-gray-600 transform transition-transform duration-200 ${
                      openCards[term.key as keyof typeof openCards]
                        ? 'rotate-45'
                        : 'rotate-[-45deg]'
                    }`}
                  />
                </div>
                {openCards[term.key as keyof typeof openCards] && (
                  <div className="mt-2 p-2 bg-gray-50 border rounded text-sm whitespace-pre-line">
                    {term.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 신청 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={!isSubmitEnabled}
            className={`w-full py-2 rounded-md text-white ${
              isSubmitEnabled ? 'bg-[#2D4739] hover:opacity-90' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            신청하기
          </button>

          {/* 숨겨진 파일 입력 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onChangeHiddenFile}
          />
        </div>
        <div className="h-24" />
      </SellerSidenavbar>
    </>
  );
}
