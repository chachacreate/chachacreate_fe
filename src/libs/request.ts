import api from '@src/libs/apiService';
import type { ApiResponse } from '@src/libs/apiResponse';
import type { AxiosResponse } from 'axios';

/** GET 요청 */
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

/** POST 요청 */
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

/** PUT 요청 */
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

/** PATCH 요청 */
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

/** DELETE 요청 */
export async function del<T>(url: string): Promise<ApiResponse<T>> {
  const response: AxiosResponse<{ data: T; status: number; message: string }> =
    await api.delete(url);
  return {
    data: response.data.data,
    status: response.data.status,
    message: response.data.message,
  };
}
