import React from 'react';
import { Link } from 'react-router-dom';
import './ErrorPage.pcss';

const ServerErrorPage: React.FC = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="error">
      <div className="error-container">
        <img src="/images/error/errorpage_500.png" alt="500 로고" className="error-image" />
        <h1>서버 오류가 발생했습니다.</h1>
        <p>
          일시적인 서버 오류로 요청을 처리할 수 없습니다.
          <br />
          잠시 후 다시 시도해주세요.
        </p>
        <div className="button-group">
          <button onClick={handleRefresh} className="refresh-button">
            새로고침
          </button>
          <Link to="/main" className="home-button">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServerErrorPage;
