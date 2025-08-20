// Login.tsx
import { useAuth } from "../contexts/AuthContext";

const Login = () => {
  const { login } = useAuth();
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <h1>로그인 (더미)</h1>
      <button onClick={() => login({ name: "김민건", email: "user@test.com" })}>
        더미 로그인
      </button>
    </section>
  );
};
export default Login;
