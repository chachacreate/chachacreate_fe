import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Home = () => {
  const { user, login, logout } = useAuth();

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <h1>메인 홈</h1>

      {!user ? (
        <button onClick={() => login({ name: "김민건", email: "user@test.com" })}>
          임시 로그인
        </button>
      ) : (
        <button onClick={logout}>임시 로그아웃</button>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <Link to="/">홈으로</Link>
        <Link to="/store/abc">스토어(abc)로</Link>
        <Link to="/store/xyz">스토어(xyz)로</Link>
      </div>

      <p>상단 헤더가 로그인 여부 / 스토어 접속 여부에 따라 바뀌는지 확인해보세요.</p>
    </section>
  );
};
export default Home;
