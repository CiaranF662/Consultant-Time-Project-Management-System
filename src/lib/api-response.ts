// #region API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
// #endregion

// #region Response Helpers
export function successResponse<T>(
  data: T,
  message?: string,
  status = 200
): Response {
  return Response.json({
    success: true,
    data,
    message
  }, { status });
}

export function errorResponse(
  error: string,
  status = 400
): Response {
  return Response.json({
    success: false,
    error
  }, { status });
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): Response {
  return Response.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}
// #endregion