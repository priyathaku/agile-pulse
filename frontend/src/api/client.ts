const BASE_URL = "/api/v1";

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type");
  let data: any = null;
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    const errorMsg =
      data?.message ||
      data?.detail ||
      response.statusText ||
      "An error occurred";
    const err = new Error(errorMsg) as Error & { code?: string; details?: any };
    err.code = data?.code;
    err.details = data?.details;
    throw err;
  }

  return data as T;
}
