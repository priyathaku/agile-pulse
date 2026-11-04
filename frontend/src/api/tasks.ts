import { apiClient } from "./client";
import { Comment, PaginatedResult, Task } from "../types";

export const tasksApi = {
  getMyTasks: (status?: string) => {
    const query = new URLSearchParams();
    if (status) query.append("status", status);
    return apiClient<PaginatedResult<Task>>(`/tasks/my?${query.toString()}`);
  },

  get: (id: number) => apiClient<Task>(`/tasks/${id}`),

  update: (id: number, data: Partial<Task>) =>
    apiClient<Task>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  reorder: (id: number, data: { position: number; status?: string }) =>
    apiClient<Task>(`/tasks/${id}/reorder`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiClient<void>(`/tasks/${id}`, {
      method: "DELETE",
    }),

  getComments: (id: number) => apiClient<Comment[]>(`/tasks/${id}/comments`),

  addComment: (id: number, content: string) =>
    apiClient<Comment>(`/tasks/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};
