import { apiClient } from "./client";
import { Job } from "../types";

export const jobsApi = {
  get: (id: string) => apiClient<Job>(`/jobs/${id}`),

  list: (status?: string, type?: string) => {
    const query = new URLSearchParams();
    if (status) query.append("status", status);
    if (type) query.append("job_type", type);
    return apiClient<Job[]>(`/jobs?${query.toString()}`);
  },

  retry: (id: string) =>
    apiClient<{ job_id: string; status: string; message: string }>(
      `/jobs/${id}/retry`,
      {
        method: "POST",
      },
    ),
};
