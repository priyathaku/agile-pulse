export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  key: string;
  description?: string | null;
  status: "active" | "archived";
  owner_id: number;
  created_at: string;
  updated_at: string;
  owner?: User;
  members_count?: number;
  stories_count?: number;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  role: "owner" | "member";
  joined_at: string;
  user: User;
}

export type StoryStatus =
  "Backlog" | "Ready" | "In Progress" | "In Review" | "Done";
export type TaskStatus = "To Do" | "In Progress" | "Blocked" | "Done";
export type PriorityLevel = "Low" | "Medium" | "High" | "Critical";

export interface UserStory {
  id: number;
  project_id: number;
  title: string;
  description?: string | null;
  acceptance_criteria?: string | null;
  status: StoryStatus;
  priority: PriorityLevel;
  story_points?: number | null;
  assignee_id?: number | null;
  position: number;
  progress_pct: number;
  tasks_count: number;
  tasks_done_count: number;
  created_at: string;
  updated_at: string;
  assignee?: User | null;
  tasks?: Task[];
}

export interface Task {
  id: number;
  story_id: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: PriorityLevel;
  assignee_id?: number | null;
  estimate_hours?: number | null;
  due_date?: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  assignee?: User | null;
  story?: {
    id: number;
    title: string;
    project_id: number;
    project?: Project;
  };
}

export interface Comment {
  id: number;
  user_id: number;
  story_id?: number | null;
  task_id?: number | null;
  content: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface ActivityLog {
  id: number;
  project_id: number;
  user_id?: number | null;
  action: string;
  entity_type: string;
  entity_id: number;
  details?: Record<string, any> | null;
  created_at: string;
  user?: User | null;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  created_at: string;
}

export interface Job {
  id: string;
  type: string;
  payload: Record<string, any>;
  status: "pending" | "running" | "succeeded" | "failed" | "dead";
  attempts: number;
  max_attempts: number;
  run_at: string;
  last_error?: string | null;
  result?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface AssigneeWorkload {
  user_id: number | null;
  user_name: string;
  task_count: number;
  story_count: number;
  story_points: number;
  estimated_hours: number;
}

export interface ProjectDashboard {
  project: Project;
  story_status_counts: Record<StoryStatus, number>;
  task_status_counts: Record<TaskStatus, number>;
  total_stories: number;
  total_tasks: number;
  overall_progress_pct: number;
  overdue_tasks_count: number;
  workload_per_assignee: AssigneeWorkload[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}
