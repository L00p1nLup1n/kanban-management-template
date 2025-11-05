import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

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
    }
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
            if (!reqUrl.includes('/auth/login') && !reqUrl.includes('/auth/register')) {
                // Redirect to login for other requests (session expired)
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;

// Type definitions
export interface User {
    id: string;
    email: string;
    name?: string;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
}

export interface Project {
    _id: string;
    ownerId: string;
    name: string;
    description?: string;
    columns: Column[];
    createdAt: string;
    updatedAt: string;
    joinCode?: string;
    members?: string[];
}

export interface Column {
    id: string;
    key: string;
    title: string;
    order: number;
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
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

// API methods
export const authAPI = {
    register: (email: string, password: string, name?: string) =>
        apiClient.post<AuthResponse>('/auth/register', { email, password, name }),

    login: (email: string, password: string) =>
        apiClient.post<AuthResponse>('/auth/login', { email, password }),

    me: () =>
        apiClient.get<{ user: User }>('/auth/me'),
};

export const projectsAPI = {
    list: () =>
        apiClient.get<{ projects: Project[] }>('/projects'),

    get: (projectId: string) =>
        apiClient.get<{ project: Project }>(`/projects/${projectId}`),

    create: (data: { name: string; description?: string; columns?: Column[] }) =>
        apiClient.post<{ project: Project }>('/projects', data),

    joinByCode: (joinCode: string) =>
        apiClient.post<{ project: Project }>('/projects/join', { joinCode }),

    update: (projectId: string, data: Partial<Project>) =>
        apiClient.patch<{ project: Project }>(`/projects/${projectId}`, data),

    delete: (projectId: string) =>
        apiClient.delete(`/projects/${projectId}`),
};

export const tasksAPI = {
    list: (projectId: string) =>
        apiClient.get<{ tasks: Task[] }>(`/projects/${projectId}/tasks`),

    create: (projectId: string, data: {
        title: string;
        columnKey: string;
        order: number;
        description?: string;
        color?: string;
    }) =>
        apiClient.post<{ task: Task }>(`/projects/${projectId}/tasks`, data),

    update: (projectId: string, taskId: string, data: Partial<Task>) =>
        apiClient.patch<{ task: Task }>(`/projects/${projectId}/tasks/${taskId}`, data),

    delete: (projectId: string, taskId: string) =>
        apiClient.delete(`/projects/${projectId}/tasks/${taskId}`),

    reorder: (projectId: string, tasks: Array<{ id: string; order: number; columnKey?: string }>) =>
        apiClient.patch<{ success: boolean }>(`/projects/${projectId}/tasks-reorder`, { tasks }),

    importLocal: (projectId: string, tasks: any[], importId?: string) =>
        apiClient.post<{ tasks: Task[]; imported: number }>(`/projects/${projectId}/import-local`, { tasks, importId }),
    // Backlog endpoints
    backlog: (projectId: string) =>
        apiClient.get<{ tasks: Task[] }>(`/projects/${projectId}/backlog`),
    createBacklog: (projectId: string, data: { title: string; description?: string; color?: string; labels?: string[]; estimate?: number }) =>
        apiClient.post<{ task: Task }>(`/projects/${projectId}/backlog`, data),
    move: (projectId: string, taskId: string, data: { toColumnKey?: string; backlog?: boolean }) =>
        apiClient.post<{ task: Task }>(`/projects/${projectId}/tasks/${taskId}/move`, data),
};
