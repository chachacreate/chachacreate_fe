import api from '@src/libs/apiService';
import type { AxiosResponse } from 'axios';
import type { ApiResponse } from '@src/libs/apiResponse';

/** GET 요청 */
export async function get<T>(url: string, params?: object): Promise<ApiResponse<T>> {
  const response: AxiosResponse<T> = await api.get<T>(url, { params });
  return {
    data: response.data,
    status: response.status,
    message: response.statusText,
  };
}

/** POST 요청 */
export async function post<T>(url: string, data?: object): Promise<ApiResponse<T>> {
  const response: AxiosResponse<T> = await api.post<T>(url, data);
  return {
    data: response.data,
    status: response.status,
    message: response.statusText,
  };
}

/** PUT 요청 */
export async function put<T>(url: string, data?: object): Promise<ApiResponse<T>> {
  const response: AxiosResponse<T> = await api.put<T>(url, data);
  return {
    data: response.data,
    status: response.status,
    message: response.statusText,
  };
}

/** PATCH 요청 */
export async function patch<T>(url: string, data?: object): Promise<ApiResponse<T>> {
  const response: AxiosResponse<T> = await api.patch<T>(url, data);
  return {
    data: response.data,
    status: response.status,
    message: response.statusText,
  };
}

/** DELETE 요청 */
export async function del<T>(url: string): Promise<ApiResponse<T>> {
  const response: AxiosResponse<T> = await api.delete<T>(url);
  return {
    data: response.data,
    status: response.status,
    message: response.statusText,
  };
}
