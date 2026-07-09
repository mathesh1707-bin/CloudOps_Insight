// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // stored as plaintext in mock — "hash" is nominal
  role: UserRole;
  avatarInitials: string;
  avatarColor: string;
}

export interface AuthSession {
  user: Omit<User, 'passwordHash'>;
  loggedInAt: number;
}

// ─── Resources ──────────────────────────────────────────────────────────────

export type ResourceType = 'EC2' | 'S3' | 'RDS' | 'Lambda' | 'LoadBalancer';
export type ResourceStatus = 'running' | 'stopped' | 'terminated' | 'warning' | 'critical';
export type Region = 'us-east-1' | 'us-west-2' | 'eu-west-1' | 'ap-southeast-1' | 'ap-northeast-1';

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  region: Region;
  status: ResourceStatus;
  uptimePercent: number;      // 0–100
  costPerMonth: number;       // USD
  cpuAvg7d: number;           // 0–100 percent
  memAvg7d: number;           // 0–100 percent
  tier: string;               // e.g. "t3.medium", "db.r5.large"
  tags: Record<string, string>;
  createdAt: string;          // ISO date string
  lastModified: string;
}

// ─── Metrics (time-series) ───────────────────────────────────────────────────

export interface MetricPoint {
  timestamp: number;          // Unix ms
  cpu: number;                // 0–100
  memory: number;             // 0–100
  networkIn: number;          // Mbps
  networkOut: number;         // Mbps
  diskRead: number;           // MB/s
  diskWrite: number;          // MB/s
}

export type MetricWindow = '24h' | '7d' | '30d';

// ─── Costs ──────────────────────────────────────────────────────────────────

export interface CostEntry {
  date: string;               // YYYY-MM-DD
  resourceId: string;
  serviceType: ResourceType;
  region: Region;
  cost: number;               // USD
}

export interface MonthlyCostSummary {
  month: string;              // YYYY-MM
  total: number;
  byService: Record<ResourceType, number>;
  byRegion: Record<Region, number>;
}

export interface BudgetConfig {
  monthlyBudget: number;      // USD
  alertThresholdPercent: number; // e.g. 80
}

// ─── Recommendations ────────────────────────────────────────────────────────

export type RecommendationType =
  | 'idle-resource'
  | 'right-size'
  | 'unattached-storage'
  | 'governance'
  | 'anomaly-driven';

export type RecommendationSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RecommendationStatus = 'open' | 'dismissed' | 'resolved';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  severity: RecommendationSeverity;
  status: RecommendationStatus;
  title: string;
  description: string;
  affectedResourceIds: string[];
  estimatedMonthlySavings: number; // USD (0 for governance)
  createdAt: string;
  resolvedAt?: string;
  anomalyId?: string; // linked anomaly if anomaly-driven
}

// ─── Anomalies ───────────────────────────────────────────────────────────────

export type AnomalySeverity = 'low' | 'medium' | 'high';
export type AnomalyStatus = 'open' | 'acknowledged' | 'resolved';

export interface Anomaly {
  id: string;
  resourceId: string;
  date: string;               // YYYY-MM-DD
  actualCost: number;         // USD that day
  expectedCost: number;       // 14-day MA
  stdDev: number;
  zScore: number;             // (actual - expected) / stdDev
  percentChange: number;      // (actual - expected) / expected * 100
  severity: AnomalySeverity;
  status: AnomalyStatus;
  explanation: string;
  createdAt: string;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export type ReportCategory = 'cost' | 'utilization' | 'governance';

export interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  lastGeneratedAt: string;
  estimatedRows: number;
}

export interface ReportRow {
  [key: string]: string | number | boolean;
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}
