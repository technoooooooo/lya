export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code: string;
  };
}

export type ApiResult<T = unknown> = ApiResponse<T> | ApiError;
