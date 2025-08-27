export interface ApiResponse<T> {
  data: T; // 실제 서버 데이터
  status: number; // HTTP 상태 코드
  message: string; // 상태 메시지
}
