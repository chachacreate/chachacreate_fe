import React from 'react';
import { Link } from 'react-router-dom';
import './ErrorPage.pcss';

const NotFoundPage: React.FC = () => {
  return (
    <div className="error">
      <div className="error-container">
        <img src="/images/error/errorpage_404.png" alt="404 로고" className="error-image" />
        <h1>죄송합니다. 페이지를 찾을 수 없습니다.</h1>
        <p>
          존재하지 않는 주소를 입력하셨거나,
          <br />
          요청하신 페이지의 주소가 변경, 삭제되어 찾을 수 없습니다.
        </p>
        <Link to="/main" className="home-button">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
