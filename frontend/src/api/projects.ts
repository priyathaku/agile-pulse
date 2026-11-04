import { apiClient } from "./client";
import {
  ActivityLog,
  Job,
  PaginatedResult,
  Project,
  ProjectDashboard,
  ProjectMember,
  User,
  UserStory,
} from "../types";

export const projectsApi = {
  list: (params?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.status) query.append("status", params.status);
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.offset) query.append("offset", params.offset.toString());
    return apiClient<PaginatedResult<Project>>(`/projects?${query.toString()}`);
  },

  get: (id: number) => apiClient<Project>(`/projects/${id}`),

  create: (data: { name: string; key: string; description?: string }) =>
    apiClient<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: number,
    data: { name?: string; description?: string; status?: string },
  ) =>
    apiClient<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiClient<void>(`/projects/${id}`, {
      method: "DELETE",
    }),

  getDashboard: (id: number) =>
    apiClient<ProjectDashboard>(`/projects/${id}/dashboard`),

  getMembers: (id: number) =>
    apiClient<ProjectMember[]>(`/projects/${id}/members`),

  addMember: (
    id: number,
    data: { user_email: string; role: "owner" | "member" },
  ) =>
    apiClient<ProjectMember>(`/projects/${id}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  removeMember: (id: number, userId: number) =>
    apiClient<void>(`/projects/${id}/members/${userId}`, {
      method: "DELETE",
    }),

  getActivity: (id: number) =>
    apiClient<ActivityLog[]>(`/projects/${id}/activity`),

  requestReport: (id: number, format: "json" | "csv" = "json") =>
    apiClient<{ job_id: string; status: string; message: string }>(
      `/projects/${id}/reports`,
      {
        method: "POST",
        body: JSON.stringify({ format }),
      },
    ),

  listReports: (id: number) => apiClient<Job[]>(`/projects/${id}/reports`),

  getStories: (
    id: number,
    params?: { status?: string; priority?: string; search?: string },
  ) => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.priority) query.append("priority", params.priority);
    if (params?.search) query.append("search", params.search);
    return apiClient<PaginatedResult<UserStory>>(
      `/projects/${id}/stories?${query.toString()}`,
    );
  },

  createStory: (id: number, data: any) =>
    apiClient<UserStory>(`/projects/${id}/stories`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const usersApi = {
  list: () => apiClient<User[]>("/users"),
};
