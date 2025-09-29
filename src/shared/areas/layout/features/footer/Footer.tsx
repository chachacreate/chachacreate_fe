import React from 'react';

interface FooterProps {
  backgroundColor?: string;
}

const Footer: React.FC<FooterProps> = ({ backgroundColor = '#2d4739' }) => {
  return (
    <footer 
      className="mt-8 sm:mt-16" 
      style={{ backgroundColor }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-xl sm:text-2xl font-bold mb-4 text-white">HandCraft</h3>
            <p className="text-white/80 text-sm sm:text-base">
              수공예의 아름다움을 전하는 <br></br>특별한 공간 : 뜨락상회
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm sm:text-base text-white">서비스</h4>
            <ul className="space-y-2 text-white/70 text-sm sm:text-base">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  스토어
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  클래스
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  커뮤니티
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm sm:text-base text-white">고객지원</h4>
            <ul className="space-y-2 text-white/70 text-sm sm:text-base">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  자주묻는질문
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  고객센터
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  배송안내
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm sm:text-base text-white">회사정보</h4>
            <ul className="space-y-2 text-white/70 text-sm sm:text-base">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  회사소개
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  이용약관
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  개인정보처리방침
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/20 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-white/70">
          <p className="text-sm sm:text-base">
            &copy; 2024 HandCraft. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;