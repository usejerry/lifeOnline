export interface ApiError {
  field?: string;
  message: string;
}

export interface ApiResponse<T> {
  code: string;
  success: boolean;
  message: string;
  data: T | null;
  errors?: ApiError[];
}
