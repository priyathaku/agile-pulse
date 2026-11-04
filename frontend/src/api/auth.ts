import { apiClient } from "./client";
import { User } from "../types";

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  register: (data: { email: string; password: string; full_name: string }) =>
    apiClient<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    apiClient<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMe: () => apiClient<User>("/auth/me"),

  logout: () =>
    apiClient<{ message: string }>("/auth/logout", {
      method: "POST",
    }),
};
