import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      // Avoid forcing a full-page redirect for auth endpoints (login/register)
      // which intentionally return 401 for invalid credentials. Let callers
      // handle the error so the UI can display a message instead of reloading.
      const reqUrl = error.config?.url || '';
      if (
        !reqUrl.includes('/auth/login') &&
        !reqUrl.includes('/auth/register')
      ) {
        // Redirect to login for other requests (session expired)
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;

// Type definitions
export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface PopulatedUser {
  _id: string;
  name?: string;
  email: string;
  role: string;
}

export interface ProjectMember {
  userId: PopulatedUser | string;
  role: string;
  joinedAt?: string;
}

export interface Project {
  _id: string;
  ownerId: string | PopulatedUser;
  name: string;
  description?: string;
  columns: Column[];
  createdAt: string;
  updatedAt: string;
  joinCode?: string;
  members?: ProjectMember[];
  budget?: number;
}

export interface Column {
  id: string;
  key: string;
  title: string;
  order: number;
  wip?: number;
}

export interface Task {
  _id: string;
  projectId: string;
  columnKey: string;
  title: string;
  description?: string;
  color?: string;
  order: number;
  assigneeId?: string;
  labels?: string[];
  estimate?: number;
  cost?: number;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  committedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

// Metrics types
export interface MetricsStats {
  avg: number;
  median: number;
  p85: number;
  min: number;
  max: number;
  count: number;
}

export interface ThroughputPoint {
  date: string;
  count: number;
}

export interface WipAgeItem {
  taskId: string;
  title: string;
  column: string;
  ageHours: number;
  priority?: 'low' | 'medium' | 'high';
}

export interface CurrentWipColumn {
  title: string;
  count: number;
  wip?: number;
}

export interface CfdData {
  columns: string[];
  data: Array<Record<string, string | number>>;
}

export interface ProjectMetrics {
  cycleTime: MetricsStats;
  leadTime: MetricsStats;
  boardLeadTime: MetricsStats;
  throughput: ThroughputPoint[];
  wipAge: WipAgeItem[];
  currentWip: Record<string, CurrentWipColumn>;
  cfd: CfdData;
  summary: {
    totalTasks: number;
    boardTasks: number;
    backlogTasks: number;
    completedInPeriod: number;
    inProgress: number;
  };
}

// API methods
export const authAPI = {
  register: (email: string, password: string, role: string, name?: string) =>
    apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
      role,
    }),

  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }),

  me: () => apiClient.get<{ user: User }>('/auth/me'),
};

export interface BudgetTask {
  _id: string;
  title: string;
  cost: number;
  columnKey?: string;
  backlog?: boolean;
}

export interface ProjectBudget {
  budget: number | null;
  totalCost: number;
  remaining: number | null;
  tasks: BudgetTask[];
}

export const projectsAPI = {
  list: () => apiClient.get<{ projects: Project[] }>('/projects'),

  get: (projectId: string) =>
    apiClient.get<{ project: Project }>(`/projects/${projectId}`),

  create: (data: {
    name: string;
    description?: string;
    columns?: Column[];
    budget?: number;
  }) => apiClient.post<{ project: Project }>('/projects', data),

  getBudget: (projectId: string) =>
    apiClient.get<ProjectBudget>(`/projects/${projectId}/budget`),

  joinByCode: (joinCode: string) =>
    apiClient.post<{ project: Project }>('/projects/join', { joinCode }),

  update: (projectId: string, data: Partial<Project>) =>
    apiClient.patch<{ project: Project }>(`/projects/${projectId}`, data),

  delete: (projectId: string) => apiClient.delete(`/projects/${projectId}`),

  removeMember: (projectId: string, memberId: string) =>
    apiClient.delete<{ project: Project; message: string }>(
      `/projects/${projectId}/members/${memberId}`,
    ),
};

export const tasksAPI = {
  list: (projectId: string) =>
    apiClient.get<{ tasks: Task[] }>(`/projects/${projectId}/tasks`),

  create: (
    projectId: string,
    data: {
      title: string;
      columnKey: string;
      order: number;
      description?: string;
      color?: string;
      priority?: 'low' | 'medium' | 'high';
    },
  ) => apiClient.post<{ task: Task }>(`/projects/${projectId}/tasks`, data),

  update: (projectId: string, taskId: string, data: Partial<Task>) =>
    apiClient.patch<{ task: Task }>(
      `/projects/${projectId}/tasks/${taskId}`,
      data,
    ),

  delete: (projectId: string, taskId: string) =>
    apiClient.delete(`/projects/${projectId}/tasks/${taskId}`),

  reorder: (
    projectId: string,
    tasks: Array<{ id: string; order: number; columnKey?: string }>,
  ) =>
    apiClient.patch<{ success: boolean }>(
      `/projects/${projectId}/tasks-reorder`,
      { tasks },
    ),

  importLocal: (projectId: string, tasks: any[], importId?: string) =>
    apiClient.post<{ tasks: Task[]; imported: number }>(
      `/projects/${projectId}/import-local`,
      { tasks, importId },
    ),
  // Backlog endpoints
  backlog: (projectId: string) =>
    apiClient.get<{ tasks: Task[] }>(`/projects/${projectId}/backlog`),
  createBacklog: (
    projectId: string,
    data: {
      title: string;
      description?: string;
      color?: string;
      labels?: string[];
      estimate?: number;
      priority?: 'low' | 'medium' | 'high';
      assigneeId?: string;
      dueDate?: string;
    },
  ) => apiClient.post<{ task: Task }>(`/projects/${projectId}/backlog`, data),
  move: (
    projectId: string,
    taskId: string,
    data: { toColumnKey?: string; backlog?: boolean },
  ) =>
    apiClient.post<{ task: Task }>(
      `/projects/${projectId}/tasks/${taskId}/move`,
      data,
    ),
};

// Dashboard types
export interface DashboardProjectSummary {
  totalTasks: number;
  boardTasks: number;
  backlogTasks: number;
  completedInPeriod: number;
  inProgress: number;
}

export interface DashboardWipConcern {
  column: string;
  title: string;
  count: number;
  limit: number;
}

export interface DashboardAgingTask {
  taskId: string;
  title: string;
  column: string;
  ageHours: number;
  priority: string;
}

export interface DashboardProject {
  projectId: string;
  name: string;
  role: 'owner' | 'member';
  health: 'on_track' | 'at_risk' | 'blocked';
  healthReasons: string[];
  summary: DashboardProjectSummary;
  cycleTime: MetricsStats;
  throughputAvg: number;
  wipConcerns: DashboardWipConcern[];
  agingTasks: DashboardAgingTask[];
}

export interface DashboardAggregated {
  totalTasks: number;
  totalInProgress: number;
  totalCompleted: number;
  totalBacklog: number;
  projectCount: number;
}

export interface DashboardDeadline {
  taskId: string;
  title: string;
  projectId: string;
  projectName: string;
  dueDate: string;
  daysUntilDue: number;
  priority: string;
  assigneeName: string | null;
}

export interface TeamMemberCapacity {
  userId: string;
  name: string;
  role: string;
  assignments: Array<{
    projectId: string;
    projectName: string;
    taskCount: number;
  }>;
  totalTasks: number;
}

export interface DashboardData {
  projects: DashboardProject[];
  aggregated: DashboardAggregated;
  upcomingDeadlines: DashboardDeadline[];
  teamCapacity: TeamMemberCapacity[];
}

export const dashboardAPI = {
  get: (days?: number) =>
    apiClient.get<{ dashboard: DashboardData }>(
      `/dashboard${days ? `?days=${days}` : ''}`,
    ),
};

export interface MyTasksProject {
  projectId: string;
  projectName: string;
  columns: Column[];
  tasks: Task[];
}

export const myTasksAPI = {
  list: () => apiClient.get<{ projects: MyTasksProject[] }>('/my-tasks'),
};

// Notification types
export interface Notification {
  _id: string;
  recipientId: string;
  type:
    | 'invitation'
    | 'task_assigned'
    | 'member_joined'
    | 'member_removed'
    | 'project_updated'
    | 'general';
  title: string;
  message?: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Invitation types
export interface Invitation {
  _id: string;
  projectId: string | { _id: string; name: string };
  senderId: string | { _id: string; name: string; email: string };
  recipientId: string | { _id: string; name: string; email: string };
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message?: string;
  expiresAt: string;
  createdAt: string;
}

export const invitationsAPI = {
  send: (projectId: string, data: { email: string; message?: string }) =>
    apiClient.post<{ invitation: Invitation }>(
      `/projects/${projectId}/invitations`,
      data,
    ),

  listPending: () =>
    apiClient.get<{ invitations: Invitation[] }>('/invitations/pending'),

  listForProject: (projectId: string) =>
    apiClient.get<{ invitations: Invitation[] }>(
      `/projects/${projectId}/invitations`,
    ),

  accept: (invitationId: string) =>
    apiClient.post<{ project: any; message: string }>(
      `/invitations/${invitationId}/accept`,
    ),

  decline: (invitationId: string) =>
    apiClient.post<{ message: string }>(`/invitations/${invitationId}/decline`),

  cancel: (invitationId: string) =>
    apiClient.delete<{ message: string }>(`/invitations/${invitationId}`),
};

export const notificationsAPI = {
  list: (params?: { limit?: number; offset?: number; unreadOnly?: boolean }) =>
    apiClient.get<{ notifications: Notification[]; unreadCount: number }>(
      '/notifications',
      { params },
    ),

  unreadCount: () =>
    apiClient.get<{ count: number }>('/notifications/unread-count'),

  markRead: (notificationId: string) =>
    apiClient.patch<Notification>(`/notifications/${notificationId}/read`),

  markAllRead: () => apiClient.patch('/notifications/read-all'),

  delete: (notificationId: string) =>
    apiClient.delete(`/notifications/${notificationId}`),
};

export const metricsAPI = {
  get: (projectId: string, days?: number) =>
    apiClient.get<{ metrics: ProjectMetrics }>(
      `/projects/${projectId}/metrics${days ? `?days=${days}` : ''}`,
    ),
};
