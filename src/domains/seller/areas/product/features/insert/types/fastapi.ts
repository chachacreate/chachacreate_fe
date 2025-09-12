// FastAPI 응답 타입 정의

/** Health Check 응답 타입 */
export interface HealthCheckResponse {
  status: string;
  services: {
    ai_model: boolean;
    database: boolean;
    price_service: boolean;
  };
}

/** 가격 정보 타입 */
export interface PriceInfo {
  average_price: number;
  min_price: number;
  max_price: number;
  median_price: number;
  q1_price: number;
  q3_price: number;
  product_count: number;
  price_stddev: number;
  db_category: string;
  ai_category: string;
  price_range: number;
}

/** 예측 결과 개별 항목 타입 */
export interface PredictionItem {
  category: string;
  confidence: number;
  category_id: number;
  price_info: PriceInfo | null;
}

/** 가격 추천 정보 타입 */
export interface PriceRecommendation {
  category: string;
  average_price: number;
  price_range: {
    min: number;
    max: number;
    median: number;
  };
  product_count: number;
  db_connected: boolean;
}

/** 이미지 예측 응답 타입 */
export interface ImagePredictionResponse {
  success: boolean;
  filename: string;
  predictions: PredictionItem[];
  top_category: string;
  top_confidence: number;
  price_recommendation: PriceRecommendation;
}
