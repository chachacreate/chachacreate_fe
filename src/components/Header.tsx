import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStoreCtx } from "../contexts/StoreContext";
import "./header.css";

const Header = () => {
  const { user, logout } = useAuth();
  const { store } = useStoreCtx();

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">ChachaCreate</Link>

        <nav className="nav">
          {!user && (
            <>
              <Link to="/login">로그인</Link>
              <span className="divider">|</span>
              <Link to="/signup">회원가입</Link>
            </>
          )}

          {user && !store && (
            <>
              <span className="greet">{user.name}님 반갑습니다!</span>
              <Link to="/messages">메시지</Link>
              <button className="logout" onClick={logout}>로그아웃</button>
            </>
          )}

          {user && store && (
            <>
              <span className="greet">{user.name}님 반갑습니다!</span>
              <Link to={`/store/${store.id}/message`}>
                {store.name}에 메시지 보내기
              </Link>
              <button className="logout" onClick={logout}>로그아웃</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
