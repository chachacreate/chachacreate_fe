import { fastApiGet, fastApiPost } from '@src/libs/request';
import type {
  HealthCheckResponse,
  ImagePredictionResponse,
} from '@src/domains/seller/areas/product/features/insert/types/fastapi';

/** FastAPI Health Check */
export async function checkFastApiHealth(): Promise<HealthCheckResponse> {
  return await fastApiGet<HealthCheckResponse>('/health');
}

/** 이미지 예측 API (파일 업로드) */
export async function predictImage(file: File): Promise<ImagePredictionResponse> {
  const formData = new FormData();
  formData.append('file', file);
  console.log('예측 시작');
  return await fastApiPost<ImagePredictionResponse>('/predict', formData);
}
