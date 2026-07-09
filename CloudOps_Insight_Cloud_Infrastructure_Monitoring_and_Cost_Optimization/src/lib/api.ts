/**
 * src/lib/api.ts
 *
 * Typed fetch wrapper for the CloudOps Insight backend.
 * All functions match the signatures already used by pages — they are
 * drop-in replacements for the mockData fetch functions.
 *
 * Falls back to mockData if VITE_API_URL is not set or the server
 * is unreachable, so the app always works standalone.
 */

import type {
  Resource, MetricPoint, CostEntry, MonthlyCostSummary,
  Recommendation, Anomaly, ReportDefinition, ReportRow,
  MetricWindow,
} from '../types';
import * as mock from '../data/mockData';

const BASE = import.meta.env.VITE_API_URL ?? '';   // '' = use Vite proxy (recommended for dev)

// Use real backend unless explicitly set to 'mock'
const USE_BACKEND = import.meta.env.VITE_API_URL !== 'mock';

// ── Auth token storage (in-memory — no localStorage) ────────────────────────
let _token: string | null = null;
export const setToken  = (t: string | null) => { _token = t; };
export const getToken  = () => _token;

// ── Core fetch helper ────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: {
    id: string; name: string; email: string; role: 'admin' | 'viewer';
    avatarInitials: string; avatarColor: string;
  };
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export async function apiSignup(name: string, email: string, password: string): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  setToken(data.token);
  return data;
}

// ── Resources ────────────────────────────────────────────────────────────────

export async function fetchResources(params?: {
  type?: string; status?: string; region?: string; search?: string;
}): Promise<Resource[]> {
  if (!USE_BACKEND) return mock.fetchResources();
  try {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][]
    ).toString();
    return await apiFetch<Resource[]>(`/api/resources${qs ? '?' + qs : ''}`);
  } catch {
    return mock.fetchResources();
  }
}

export async function fetchResource(id: string): Promise<Resource | null> {
  if (!USE_BACKEND) return mock.fetchResource(id);
  try {
    return await apiFetch<Resource>(`/api/resources/${id}`);
  } catch {
    return mock.fetchResource(id);
  }
}

// ── Metrics ──────────────────────────────────────────────────────────────────

export async function fetchMetrics(resourceId: string, window: MetricWindow): Promise<MetricPoint[]> {
  if (!USE_BACKEND) return mock.fetchMetrics(resourceId, window);
  try {
    return await apiFetch<MetricPoint[]>(`/api/metrics/${resourceId}?window=${window}`);
  } catch {
    return mock.fetchMetrics(resourceId, window);
  }
}

// ── Costs ────────────────────────────────────────────────────────────────────

export async function fetchCostEntries(days = 30): Promise<CostEntry[]> {
  if (!USE_BACKEND) return mock.fetchCostEntries(days);
  try {
    return await apiFetch<CostEntry[]>(`/api/costs?days=${days}`);
  } catch {
    return mock.fetchCostEntries(days);
  }
}

export async function fetchMonthlySummaries(): Promise<MonthlyCostSummary[]> {
  if (!USE_BACKEND) return mock.fetchMonthlySummaries();
  try {
    return await apiFetch<MonthlyCostSummary[]>('/api/costs/monthly');
  } catch {
    return mock.fetchMonthlySummaries();
  }
}

// ── Recommendations ──────────────────────────────────────────────────────────

export async function fetchRecommendations(): Promise<Recommendation[]> {
  if (!USE_BACKEND) return mock.fetchRecommendations();
  try {
    return await apiFetch<Recommendation[]>('/api/recommendations');
  } catch {
    return mock.fetchRecommendations();
  }
}

export async function updateRecommendationStatus(
  id: string, status: Recommendation['status']
): Promise<Recommendation> {
  if (!USE_BACKEND) {
    await mock.delay(300);
    const found = mock.MOCK_RECOMMENDATIONS.find(r => r.id === id);
    if (!found) throw new Error('Not found');
    found.status = status;
    return found;
  }
  return apiFetch<Recommendation>(`/api/recommendations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ── Anomalies ────────────────────────────────────────────────────────────────

export async function fetchAnomalies(): Promise<Anomaly[]> {
  if (!USE_BACKEND) return mock.fetchAnomalies();
  try {
    return await apiFetch<Anomaly[]>('/api/anomalies');
  } catch {
    return mock.fetchAnomalies();
  }
}

export async function updateAnomalyStatus(
  id: string, status: Anomaly['status']
): Promise<Anomaly> {
  if (!USE_BACKEND) {
    await mock.delay(300);
    const found = mock.MOCK_ANOMALIES.find(a => a.id === id);
    if (!found) throw new Error('Not found');
    found.status = status;
    return found;
  }
  return apiFetch<Anomaly>(`/api/anomalies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ── Reports ──────────────────────────────────────────────────────────────────

export async function fetchReportDefinitions(): Promise<ReportDefinition[]> {
  if (!USE_BACKEND) return mock.fetchReportDefinitions();
  try {
    return await apiFetch<ReportDefinition[]>('/api/reports');
  } catch {
    return mock.fetchReportDefinitions();
  }
}

export async function fetchReportData(reportId: string): Promise<ReportRow[]> {
  if (!USE_BACKEND) return mock.fetchReportData(reportId);
  try {
    return await apiFetch<ReportRow[]>(`/api/reports/${reportId}/data`);
  } catch {
    return mock.fetchReportData(reportId);
  }
}

// ── Re-export non-API helpers from mockData so pages only import from api.ts ─
export {
  getDashboardSummary,
  generateLivePoint,
  exportToCSV,
  MOCK_BUDGET,
  MOCK_RESOURCES,
  MOCK_RECOMMENDATIONS,
  MOCK_ANOMALIES,
  MOCK_COST_ENTRIES,
} from '../data/mockData';
