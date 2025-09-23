import React from 'react';
import { Link } from 'react-router-dom';
import './ErrorPage.pcss';

const BadRequestPage: React.FC = () => {
  return (
    <div className="error">
      <div className="error-container">
        <img src="/images/error/errorpage_400.png" alt="400 로고" className="error-image" />
        <h1>잘못된 요청입니다.</h1>
        <p>
          요청하신 내용에 오류가 있습니다.
          <br />
          입력하신 정보를 다시 확인해주세요.
        </p>
        <Link to="/main" className="home-button">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
};

export default BadRequestPage;
