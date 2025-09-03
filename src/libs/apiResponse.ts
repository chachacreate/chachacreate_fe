export interface ApiResponse<T> {
  data: T; // 실제 서버 데이터
  status: number; // HTTP 상태 코드
  message: string; // 상태 메시지
}

// JWT 토큰 타입 정의
export interface JWTPayload {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: string;
  sub: string; // subject (email)
  iat: number; // issued at
  exp: number; // expiration
}
