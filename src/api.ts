const API_BASE = '/api';
const AUTH_TOKEN = 'dev-token';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export interface Workspace {
  id: string;
  name: string;
  roleArn: string;
  awsAccountId: string;
  status: string;
  createdAt: string;
  _count?: { recommendations: number };
}

export interface Recommendation {
  id: string;
  workspaceId: string;
  type: string;
  resourceId: string;
  description: string;
  estimatedMonthlySavings: number;
  confidence: string;
  status: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface RecommendationsResponse {
  summary: {
    totalRecommendations: number;
    totalEstimatedSavings: number;
    byStatus: { new: number; acknowledged: number; dismissed: number };
  };
  recommendations: Recommendation[];
}

export interface CostData {
  totalMonthly: number;
  byService: Record<string, number>;
  currency: string;
}

export interface Resource {
  id: string;
  workspaceId: string;
  resourceId: string;
  service: string;
  type: string;
  name: string;
  tags: Record<string, string>;
  state: string;
  lastSeenAt: string;
  estimatedMonthlyCost: number;
}

export interface InventoryResponse {
  items: Resource[];
  total: number;
  page: number;
  perPage: number;
}

export interface CostsSummary {
    total: number;
    byService: { service: string; cost: number }[];
    byTag: { tag: string; cost: number }[];
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  database: string;
  lastJobRun: {
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    recommendationsFound: number;
  } | null;
}

export const api = {
  health: () => request<HealthResponse>('/health'),

  listWorkspaces: () => request<Workspace[]>('/workspaces'),

  createWorkspace: (data: { roleArn: string; awsAccountId: string; name?: string }) =>
    request<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  testConnection: (id: string) =>
    request<{ status: string; message: string }>(`/workspaces/${id}/test-connection`, {
      method: 'POST',
    }),

  getRecommendations: (workspaceId: string, status?: string) => {
    const params = status ? `?status=${status}` : '';
    return request<RecommendationsResponse>(
      `/workspaces/${workspaceId}/recommendations${params}`
    );
  },

  getRecommendation: (id: string) =>
    request<Recommendation>(`/recommendations/${id}`),

  updateRecommendationStatus: (id: string, status: string) =>
    request<Recommendation>(`/recommendations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getCosts: (workspaceId: string) =>
    request<CostData>(`/workspaces/${workspaceId}/costs`),
    
  getInventory: (workspaceId: string, params: { page?: number, perPage?: number, service?: string, tag?: string, q?: string }) => {
    const query = new URLSearchParams({ workspaceId });
    if (params.page) query.set('page', params.page.toString());
    if (params.perPage) query.set('perPage', params.perPage.toString());
    if (params.service) query.set('service', params.service);
    if (params.tag) query.set('tag', params.tag);
    if (params.q) query.set('q', params.q);
    return request<InventoryResponse>(`/inventory?${query.toString()}`);
    },

  getCostsSummary: (workspaceId: string) =>
    request<CostsSummary>(`/costs/summary?workspaceId=${workspaceId}`),
};
