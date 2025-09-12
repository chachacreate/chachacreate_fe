import api, { legacyApi, fastApi } from '@src/libs/apiService';
import type { ApiResponse } from '@src/libs/apiResponse';
import type { AxiosResponse } from 'axios';

// ====================== Spring Boot API Functions (JWT 기반) ======================

/** GET 요청 (Boot) */
export async function get<T>(url: string, params?: object): Promise<ApiResponse<T>> {
  const response: AxiosResponse<{ data: T; status: number; message: string }> = await api.get(url, {
    params,
  });
  return {
    data: response.data.data,
    status: response.data.status,
    message: response.data.message,
  };
}

/** POST 요청 (Boot) */
export async function post<T>(url: string, data?: object): Promise<ApiResponse<T>> {
  const response: AxiosResponse<{ data: T; status: number; message: string }> = await api.post(
    url,
    data
  );
  return {
    data: response.data.data,
    status: response.data.status,
    message: response.data.message,
  };
}

/** PUT 요청 (Boot) */
export async function put<T>(url: string, data?: object): Promise<ApiResponse<T>> {
  const response: AxiosResponse<{ data: T; status: number; message: string }> = await api.put(
    url,
    data
  );
  return {
    data: response.data.data,
    status: response.data.status,
    message: response.data.message,
  };
}

/** PATCH 요청 (Boot) */
export async function patch<T>(url: string, data?: object): Promise<ApiResponse<T>> {
  const response: AxiosResponse<{ data: T; status: number; message: string }> = await api.patch(
    url,
    data
  );
  return {
    data: response.data.data,
    status: response.data.status,
    message: response.data.message,
  };
}

/** DELETE 요청 (Boot) */
export async function del<T>(url: string): Promise<ApiResponse<T>> {
  const response: AxiosResponse<{ data: T; status: number; message: string }> =
    await api.delete(url);
  return {
    data: response.data.data,
    status: response.data.status,
    message: response.data.message,
  };
}

// ====================== Legacy API Functions (세션 기반) ======================

/** GET 요청 (Legacy) */
export async function legacyGet<T>(url: string, params?: object): Promise<T> {
  const response: AxiosResponse<T> = await legacyApi.get(url, { params });
  return response.data;
}

/** POST 요청 (Legacy) */
export async function legacyPost<T>(url: string, data?: object): Promise<T> {
  const response: AxiosResponse<T> = await legacyApi.post(url, data);
  return response.data;
}

/** PUT 요청 (Legacy) */
export async function legacyPut<T>(url: string, data?: object): Promise<T> {
  const response: AxiosResponse<T> = await legacyApi.put(url, data);
  return response.data;
}

/** PATCH 요청 (Legacy) */
export async function legacyPatch<T>(url: string, data?: object): Promise<T> {
  const response: AxiosResponse<T> = await legacyApi.patch(url, data);
  return response.data;
}

/** DELETE 요청 (Legacy) */
export async function legacyDel<T>(url: string): Promise<T> {
  const response: AxiosResponse<T> = await legacyApi.delete(url);
  return response.data;
}

// ====================== FastAPI Functions (토큰 불필요) ======================

/** GET 요청 (FastAPI) */
export async function fastApiGet<T>(url: string, params?: object): Promise<T> {
  const response: AxiosResponse<T> = await fastApi.get(url, { params });
  return response.data;
}

/** POST 요청 (FastAPI) */
export async function fastApiPost<T>(url: string, data?: object): Promise<T> {
  const response: AxiosResponse<T> = await fastApi.post(url, data);
  return response.data;
}

/** PUT 요청 (FastAPI) */
export async function fastApiPut<T>(url: string, data?: object): Promise<T> {
  const response: AxiosResponse<T> = await fastApi.put(url, data);
  return response.data;
}

/** PATCH 요청 (FastAPI) */
export async function fastApiPatch<T>(url: string, data?: object): Promise<T> {
  const response: AxiosResponse<T> = await fastApi.patch(url, data);
  return response.data;
}

/** DELETE 요청 (FastAPI) */
export async function fastApiDel<T>(url: string): Promise<T> {
  const response: AxiosResponse<T> = await fastApi.delete(url);
  return response.data;
}
