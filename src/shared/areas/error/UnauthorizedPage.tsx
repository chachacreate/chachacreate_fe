import React from 'react';
import { Link } from 'react-router-dom';
import './ErrorPage.pcss';

const UnauthorizedPage: React.FC = () => {
  return (
    <div className="error">
      <div className="error-container">
        <img src="/images/error/errorpage_401.png" alt="401 로고" className="error-image" />
        <h1>로그인이 필요합니다.</h1>
        <p>
          해당 페이지에 접근하려면 로그인이 필요합니다.
          <br />
          로그인 후 다시 시도해주세요.
        </p>
        <div className="button-group">
          <Link to="/auth/login" className="login-button">
            로그인하기
          </Link>
          <Link to="/main" className="home-button">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
