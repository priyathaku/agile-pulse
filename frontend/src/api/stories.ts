import { apiClient } from "./client";
import { Comment, PaginatedResult, Task, UserStory } from "../types";

export const storiesApi = {
  get: (id: number) => apiClient<UserStory>(`/stories/${id}`),

  update: (id: number, data: Partial<UserStory>) =>
    apiClient<UserStory>(`/stories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  reorder: (id: number, data: { position: number; status?: string }) =>
    apiClient<UserStory>(`/stories/${id}/reorder`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiClient<void>(`/stories/${id}`, {
      method: "DELETE",
    }),

  getTasks: (id: number) =>
    apiClient<PaginatedResult<Task>>(`/stories/${id}/tasks`),

  createTask: (id: number, data: any) =>
    apiClient<Task>(`/stories/${id}/tasks`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getComments: (id: number) => apiClient<Comment[]>(`/stories/${id}/comments`),

  addComment: (id: number, content: string) =>
    apiClient<Comment>(`/stories/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};
