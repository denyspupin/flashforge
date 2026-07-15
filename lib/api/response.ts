export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "INTERNAL_ERROR"

export interface ApiResponse<T> {
  data: T | null
  error: {
    message: string
    code: ApiErrorCode
  } | null
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return { data, error: null }
}

export function errorResponse(
  message: string,
  code: ApiErrorCode
): ApiResponse<null> {
  return { data: null, error: { message, code } }
}
